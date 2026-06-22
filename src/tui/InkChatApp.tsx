import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, useApp, useInput } from "ink";
import { ChatApp } from "../core/app.js";
import { estimateContextUsage } from "../core/context-usage.js";
import { parseCommand } from "../cli/commands.js";
import type { Conversation } from "../storage/schema.js";
import { useBatchedStream } from "./hooks/useBatchedStream.js";
import { useTerminalSize } from "./hooks/useTerminalSize.js";
import { InputBox } from "./components/InputBox.js";
import { OutputBox } from "./components/OutputBox.js";
import { StatusLine } from "./components/StatusLine.js";
import { PickerBox, type PickerItem } from "./components/PickerBox.js";
import {
  errorMessage,
  formatConversationPickerRows,
  formatConversationList,
  formatHelp,
  formatModelPickerRows,
  formatModels,
  formatSearchMatches,
  fromMessages,
  notice,
  type DisplayMessage,
  type TuiMode,
  type TuiStatus
} from "./state.js";
import type { ConversationSummary } from "../storage/schema.js";
import type { OllamaModel } from "../ollama/types.js";

type InkChatAppProps = {
  app?: ChatApp;
  startupMode?: TuiStartupMode;
};

export type TuiStartupMode =
  | { type: "none" }
  | { type: "new" }
  | { type: "continue" }
  | { type: "resume"; reference: string };

const DEFAULT_STARTUP_MODE: TuiStartupMode = { type: "none" };

export function InkChatApp({ app: providedApp, startupMode = DEFAULT_STARTUP_MODE }: InkChatAppProps) {
  const app = useMemo(() => providedApp ?? new ChatApp(), [providedApp]);
  const { exit } = useApp();
  const terminal = useTerminalSize();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [mode, setMode] = useState<TuiMode>("chat");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeModel, setActiveModel] = useState<string | undefined>();
  const [contextEstimate, setContextEstimate] = useState<TuiStatus["contextEstimate"]>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modelOptions, setModelOptions] = useState<OllamaModel[]>([]);
  const [conversationOptions, setConversationOptions] = useState<ConversationSummary[]>([]);

  const appendMessage = useCallback((message: DisplayMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const appendAssistantDelta = useCallback((delta: string) => {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && last.isStreaming) {
        next[next.length - 1] = {
          ...last,
          content: `${last.content}${delta}`
        };
        return next;
      }

      return [
        ...next,
        {
          id: streamingAssistantId(),
          role: "assistant",
          content: delta,
          isStreaming: true
        }
      ];
    });
  }, []);

  const stream = useBatchedStream(appendAssistantDelta);

  const syncFromConversation = useCallback(
    (extraMessages: DisplayMessage[] = []) => {
      const conversation = app.currentConversation;
      setActiveModel(conversation?.model ?? app.rememberedModel);
      setContextEstimate(conversation ? estimateContextUsage(conversation) : undefined);
      setMessages([...fromMessages(conversation?.messages ?? []), ...extraMessages]);
    },
    [app]
  );

  useEffect(() => {
    app
      .init()
      .then(async () => {
        const startupNotice = await applyStartupMode(app, startupMode);
        syncFromConversation([notice(startupNotice)]);
      })
      .catch((error: unknown) => {
        appendMessage(errorMessage((error as Error).message));
        syncStatusOnly(app, setActiveModel, setContextEstimate);
      });
  }, [app, appendMessage, startupMode, syncFromConversation]);

  const closePicker = useCallback(() => {
    setMode("chat");
    setSelectedIndex(0);
    setModelOptions([]);
    setConversationOptions([]);
  }, []);

  const selectModel = useCallback(
    async (model: OllamaModel) => {
      const modelName = model.name ?? model.model;
      if (!modelName) {
        appendMessage(errorMessage("Selected model is invalid."));
        return;
      }

      if (app.currentConversation) {
        await app.switchModel(modelName);
        closePicker();
        syncFromConversation([notice(`Selected model: ${modelName}`)]);
      } else {
        await app.setDefaultModel(modelName);
        setActiveModel(app.rememberedModel);
        setContextEstimate(undefined);
        closePicker();
        appendMessage(notice(`Selected model: ${modelName}`));
      }
    },
    [app, appendMessage, closePicker, syncFromConversation]
  );

  const selectConversation = useCallback(
    async (conversation: ConversationSummary) => {
      const loaded = await app.loadConversation(conversation.id);
      closePicker();
      syncFromConversation([notice(`Loaded: ${loaded.title}`)]);
    },
    [app, closePicker, syncFromConversation]
  );

  useInput((_, key) => {
    if (mode === "select-model" || mode === "select-conversation") {
      const optionsLength = mode === "select-model" ? modelOptions.length : conversationOptions.length;

      if (key.escape) {
        closePicker();
        appendMessage(notice("Selection cancelled."));
        return;
      }

      if (optionsLength === 0) {
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((current) => (current - 1 + optionsLength) % optionsLength);
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((current) => (current + 1) % optionsLength);
        return;
      }

      if (key.return) {
        if (mode === "select-model") {
          const model = modelOptions[selectedIndex];
          if (model) {
            void selectModel(model).catch((error: unknown) => {
              appendMessage(errorMessage((error as Error).message));
              closePicker();
              syncStatusOnly(app, setActiveModel, setContextEstimate);
            });
          }
        } else {
          const conversation = conversationOptions[selectedIndex];
          if (conversation) {
            void selectConversation(conversation).catch((error: unknown) => {
              appendMessage(errorMessage((error as Error).message));
              closePicker();
              syncStatusOnly(app, setActiveModel, setContextEstimate);
            });
          }
        }
      }
      return;
    }

    if (key.escape && mode === "edit-user") {
      setMode("chat");
      setInput("");
      appendMessage(notice("Edit cancelled."));
    }
  });

  const submit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming || mode === "select-model" || mode === "select-conversation") {
        return;
      }

      setInput("");

      try {
        if (mode === "edit-user") {
          setMode("chat");
          await submitEditedMessage(app, trimmed, setMessages, setIsStreaming, stream, syncFromConversation);
          return;
        }

        const command = parseCommand(trimmed);
        if (command) {
          const shouldExit = await handleCommand({
            app,
            name: command.name,
            args: command.args,
            setInput,
            setMode,
            setMessages,
            setIsStreaming,
            setSelectedIndex,
            setModelOptions,
            setConversationOptions,
            appendMessage,
            stream,
            syncFromConversation
          });

          if (shouldExit) {
            exit();
          }
          return;
        }

        await submitChatMessage(app, trimmed, setMessages, setIsStreaming, stream, syncFromConversation);
      } catch (error) {
        appendMessage(errorMessage((error as Error).message));
        setIsStreaming(false);
        stream.reset();
        syncStatusOnly(app, setActiveModel, setContextEstimate);
      }
    },
    [
      app,
      appendMessage,
      exit,
      isStreaming,
      mode,
      stream,
      syncFromConversation,
      setActiveModel,
      setContextEstimate
    ]
  );

  const status: TuiStatus = {
    activeModel,
    contextEstimate,
    mode,
    isStreaming
  };

  const picker = pickerForMode(mode, selectedIndex, modelOptions, conversationOptions);
  const outputHeight = Math.max(6, terminal.rows - (picker ? 10 : 5));

  return (
    <Box flexDirection="column" width={terminal.columns}>
      <OutputBox messages={messages} height={outputHeight} />
      {picker ? (
        <PickerBox
          title={picker.title}
          items={picker.items}
          selectedIndex={selectedIndex}
          emptyText={picker.emptyText}
        />
      ) : null}
      <InputBox
        value={input}
        mode={mode}
        isDisabled={isStreaming || mode === "select-model" || mode === "select-conversation"}
        onChange={setInput}
        onSubmit={submit}
      />
      <StatusLine status={status} />
    </Box>
  );
}

async function applyStartupMode(app: ChatApp, startupMode: TuiStartupMode): Promise<string> {
  switch (startupMode.type) {
    case "new": {
      const conversation = await app.startDefaultConversation();
      return `Started ${conversation.id} with ${conversation.model}.`;
    }
    case "continue": {
      await app.ensureOllamaRunning();
      const conversation = await app.continueLatestConversation();
      return `Loaded latest: ${conversation.title}`;
    }
    case "resume": {
      await app.ensureOllamaRunning();
      const conversation = await app.resumeConversation(startupMode.reference);
      return `Loaded: ${conversation.title}`;
    }
    case "none":
      return app.currentConversation
        ? `Ready with ${app.currentConversation.model}.`
        : "Ready. Use /new to begin, /help for commands, /exit to leave.";
  }
}

type CommandContext = {
  app: ChatApp;
  name: string;
  args: string;
  setInput: (value: string) => void;
  setMode: (mode: TuiMode) => void;
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  setIsStreaming: (value: boolean) => void;
  setSelectedIndex: (value: number) => void;
  setModelOptions: (value: OllamaModel[]) => void;
  setConversationOptions: (value: ConversationSummary[]) => void;
  appendMessage: (message: DisplayMessage) => void;
  stream: ReturnType<typeof useBatchedStream>;
  syncFromConversation: (extraMessages?: DisplayMessage[]) => void;
};

async function handleCommand(context: CommandContext): Promise<boolean> {
  const { app, name, args, appendMessage, syncFromConversation } = context;

  switch (name) {
    case "help":
      appendMessage(notice(formatHelp()));
      return false;
    case "models":
      await openModelPicker(context);
      return false;
    case "new": {
      const conversation = await app.startNew(args || undefined);
      syncFromConversation([notice(`Started ${conversation.id} with ${conversation.model}.`)]);
      return false;
    }
    case "list":
      await openConversationPicker(context);
      return false;
    case "load": {
      requireArg(args, "/load <id-or-title>");
      const conversation = await app.loadConversation(args);
      syncFromConversation([notice(`Loaded: ${conversation.title}`)]);
      return false;
    }
    case "save":
      await app.saveCurrent();
      syncFromConversation([notice("Saved.")]);
      return false;
    case "model":
      requireArg(args, "/model <name>");
      await app.switchModel(args);
      syncFromConversation([notice(`Switched to ${args}.`)]);
      return false;
    case "system":
      if (args.toLowerCase() === "clear") {
        await app.setSystem(undefined);
        syncFromConversation([notice("System prompt cleared.")]);
      } else {
        requireArg(args, "/system <prompt> or /system clear");
        await app.setSystem(args);
        syncFromConversation([notice("System prompt saved.")]);
      }
      return false;
    case "search":
      requireArg(args, "/search <query>");
      appendMessage(notice(formatSearchMatches(await app.search(args))));
      return false;
    case "regen":
      await regenerate(context);
      return false;
    case "edit":
      enterEditMode(context);
      return false;
    case "clear":
      context.setMessages([]);
      return false;
    case "exit":
    case "quit":
      if (app.currentConversation) {
        await app.saveCurrent();
      }
      return true;
    default:
      appendMessage(errorMessage(`Unknown command: /${name}\n\n${formatHelp()}`));
      return false;
  }
}

async function submitChatMessage(
  app: ChatApp,
  content: string,
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>,
  setIsStreaming: (value: boolean) => void,
  stream: ReturnType<typeof useBatchedStream>,
  syncFromConversation: (extraMessages?: DisplayMessage[]) => void
): Promise<void> {
  ensureConversation(app.currentConversation);
  setIsStreaming(true);
  stream.reset();
  setMessages((current) => [
    ...current,
    {
      id: `pending_user_${Date.now()}`,
      role: "user",
      content
    },
    {
      id: streamingAssistantId(),
      role: "assistant",
      content: "",
      isStreaming: true
    }
  ]);

  await app.submitUserMessage(content, stream.push);
  stream.flush();
  setIsStreaming(false);
  syncFromConversation();
}

async function regenerate(context: CommandContext): Promise<void> {
  const { app, setMessages, setIsStreaming, stream, syncFromConversation } = context;
  ensureConversation(app.currentConversation);
  setIsStreaming(true);
  stream.reset();
  setMessages((current) => [
    ...removeLastAssistant(current),
    {
      id: streamingAssistantId(),
      role: "assistant",
      content: "",
      isStreaming: true
    }
  ]);

  await app.regenerate(stream.push);
  stream.flush();
  setIsStreaming(false);
  syncFromConversation();
}

async function submitEditedMessage(
  app: ChatApp,
  replacement: string,
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>,
  setIsStreaming: (value: boolean) => void,
  stream: ReturnType<typeof useBatchedStream>,
  syncFromConversation: (extraMessages?: DisplayMessage[]) => void
): Promise<void> {
  ensureConversation(app.currentConversation);
  setIsStreaming(true);
  stream.reset();
  setMessages([
    ...fromMessages(removeMessagesAfterLastUser(app.getCurrentMessages(), replacement)),
    {
      id: streamingAssistantId(),
      role: "assistant",
      content: "",
      isStreaming: true
    }
  ]);

  await app.editLastUserMessage(replacement, stream.push);
  stream.flush();
  setIsStreaming(false);
  syncFromConversation();
}

function enterEditMode({ app, setInput, setMode, appendMessage }: CommandContext): void {
  const lastUser = [...app.getCurrentMessages()].reverse().find((message) => message.role === "user");
  if (!lastUser) {
    throw new Error("There is no user message to edit.");
  }

  setInput(lastUser.content);
  setMode("edit-user");
  appendMessage(notice("Editing last user message. Press Enter to submit or Esc to cancel."));
}

function syncStatusOnly(
  app: ChatApp,
  setActiveModel: (value: string | undefined) => void,
  setContextEstimate: (value: TuiStatus["contextEstimate"]) => void
): void {
  const conversation = app.currentConversation;
  setActiveModel(conversation?.model ?? app.rememberedModel);
  setContextEstimate(conversation ? estimateContextUsage(conversation) : undefined);
}

async function openModelPicker({
  app,
  setSelectedIndex,
  setModelOptions,
  setConversationOptions,
  setMode,
  appendMessage
}: CommandContext): Promise<void> {
  const models = await app.listModels();
  if (models.length === 0) {
    appendMessage(notice(formatModels(models)));
    return;
  }

  setConversationOptions([]);
  setModelOptions(models);
  setSelectedIndex(0);
  setMode("select-model");
}

async function openConversationPicker({
  app,
  setSelectedIndex,
  setModelOptions,
  setConversationOptions,
  setMode,
  appendMessage
}: CommandContext): Promise<void> {
  const conversations = await app.listConversations();
  if (conversations.length === 0) {
    appendMessage(notice(formatConversationList(conversations)));
    return;
  }

  setModelOptions([]);
  setConversationOptions(conversations);
  setSelectedIndex(0);
  setMode("select-conversation");
}

function pickerForMode(
  mode: TuiMode,
  selectedIndex: number,
  modelOptions: OllamaModel[],
  conversationOptions: ConversationSummary[]
):
  | {
      title: string;
      items: PickerItem[];
      selectedIndex: number;
      emptyText: string;
    }
  | undefined {
  if (mode === "select-model") {
    return {
      title: "Select model",
      selectedIndex,
      emptyText: "No Ollama models installed.",
      items: formatModelPickerRows(modelOptions).map((label) => ({ label }))
    };
  }

  if (mode === "select-conversation") {
    return {
      title: "Select conversation",
      selectedIndex,
      emptyText: "No saved conversations yet.",
      items: formatConversationPickerRows(conversationOptions).map((label) => ({ label }))
    };
  }

  return undefined;
}

function removeLastAssistant(messages: DisplayMessage[]): DisplayMessage[] {
  const next = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.role === "assistant") {
      next.splice(index, 1);
      return next;
    }
  }
  return next;
}

function removeMessagesAfterLastUser(messages: Conversation["messages"], replacement: string) {
  const next = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.role === "user") {
      next[index] = {
        ...next[index],
        content: replacement
      };
      return next.slice(0, index + 1);
    }
  }
  return next;
}

function ensureConversation(conversation: Conversation | undefined): asserts conversation is Conversation {
  if (!conversation) {
    throw new Error("No active conversation. Use /new [model] or /load <id-or-title> first.");
  }
}

function requireArg(value: string, usage: string): void {
  if (!value.trim()) {
    throw new Error(`Usage: ${usage}`);
  }
}

function streamingAssistantId(): string {
  return `streaming_assistant_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

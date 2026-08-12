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
  formatProviderPickerRows,
  formatSearchMatches,
  fromMessages,
  notice,
  type DisplayMessage,
  type TuiMode,
  type TuiStatus
} from "./state.js";
import type { ConversationSummary } from "../storage/schema.js";
import type { ModelInfo, ProviderId } from "../providers/types.js";
import { parseProviderId, PROVIDER_IDS } from "../providers/config.js";

type InkChatAppProps = {
  app?: ChatApp;
  startupMode?: TuiStartupMode;
  startupProvider?: ProviderId;
  startupBaseUrl?: string;
  startupProviderBaseUrls?: Partial<Record<ProviderId, string>>;
  startupProviderApiKeys?: Partial<Record<ProviderId, string>>;
};

export type TuiStartupMode =
  | { type: "none" }
  | { type: "new" }
  | { type: "continue" }
  | { type: "resume"; reference: string };

const DEFAULT_STARTUP_MODE: TuiStartupMode = { type: "none" };

export function InkChatApp({
  app: providedApp,
  startupMode = DEFAULT_STARTUP_MODE,
  startupProvider,
  startupBaseUrl,
  startupProviderBaseUrls,
  startupProviderApiKeys
}: InkChatAppProps) {
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
  const [modelOptions, setModelOptions] = useState<ModelInfo[]>([]);
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
        for (const provider of PROVIDER_IDS) {
          const url = startupProviderBaseUrls?.[provider];
          if (url) await app.configureProvider(provider, url, false);
        }
        for (const [provider, key] of Object.entries(startupProviderApiKeys ?? {}) as Array<
          [ProviderId, string]
        >) {
          if (key) app.setApiKey(provider, key);
        }
        if (startupProvider || startupBaseUrl) {
          await app.configureProvider(startupProvider ?? app.activeProvider, startupBaseUrl);
        }
        const startupNotice = await applyStartupMode(app, startupMode);
        syncFromConversation([notice(startupNotice)]);
      })
      .catch((error: unknown) => {
        appendMessage(errorMessage((error as Error).message));
        syncStatusOnly(app, setActiveModel, setContextEstimate);
      });
  }, [app, appendMessage, startupMode, startupProvider, startupBaseUrl, startupProviderBaseUrls, startupProviderApiKeys, syncFromConversation]);

  const closePicker = useCallback(() => {
    setMode("chat");
    setSelectedIndex(0);
    setModelOptions([]);
    setConversationOptions([]);
  }, []);

  const selectModel = useCallback(
    async (model: ModelInfo) => {
      const modelName = model.id;
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

  const selectProvider = useCallback(
    async (provider: ProviderId) => {
      const model = await app.selectProvider(provider);
      closePicker();
      syncFromConversation([notice(`Selected provider: ${provider} (${model}).`)]);
    },
    [app, closePicker, syncFromConversation]
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
    if (mode === "select-provider" || mode === "select-model" || mode === "select-conversation") {
      const optionsLength = mode === "select-provider"
        ? PROVIDER_IDS.length
        : mode === "select-model" ? modelOptions.length : conversationOptions.length;

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
        if (mode === "select-provider") {
          const provider = PROVIDER_IDS[selectedIndex];
          if (provider) {
            void selectProvider(provider).catch((error: unknown) => {
              appendMessage(errorMessage((error as Error).message));
              closePicker();
            });
          }
        } else if (mode === "select-model") {
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
      if (!trimmed || isStreaming || mode === "select-provider" || mode === "select-model" || mode === "select-conversation") {
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
    activeProvider: app.activeProvider,
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
        isDisabled={isStreaming || mode === "select-provider" || mode === "select-model" || mode === "select-conversation"}
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
      const conversation = await app.continueLatestConversation();
      return `Loaded latest: ${conversation.title}`;
    }
    case "resume": {
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
  setModelOptions: (value: ModelInfo[]) => void;
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
    case "provider":
      if (args) {
        const provider = parseProviderId(args);
        const model = await app.selectProvider(provider);
        syncFromConversation([notice(`Selected provider: ${provider} (${model}).`)]);
      } else {
        context.setModelOptions([]);
        context.setConversationOptions([]);
        context.setSelectedIndex(0);
        context.setMode("select-provider");
      }
      return false;
    case "key": {
      const { provider, key, clear } = parseKeyArgs(args);
      if (clear) {
        app.clearApiKey(provider);
        appendMessage(notice(`Cleared the ${provider} API key from the keychain.`));
      } else if (key) {
        app.setApiKey(provider, key);
        appendMessage(notice(`Saved the ${provider} API key to the system keychain.`));
      } else {
        appendMessage(
          app.hasApiKey(provider)
            ? notice(`An API key is configured for ${provider}.`)
            : notice(`No API key is configured for ${provider}. Use /key ${provider} <key> to add one.`)
        );
      }
      return false;
    }
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
  modelOptions: ModelInfo[],
  conversationOptions: ConversationSummary[]
):
  | {
      title: string;
      items: PickerItem[];
      selectedIndex: number;
      emptyText: string;
    }
  | undefined {
  if (mode === "select-provider") {
    return {
      title: "Select provider",
      selectedIndex,
      emptyText: "No providers configured.",
      items: formatProviderPickerRows(PROVIDER_IDS).map((label) => ({ label }))
    };
  }

  if (mode === "select-model") {
    return {
      title: "Select model",
      selectedIndex,
      emptyText: "No models are available from the active provider.",
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

function parseKeyArgs(args: string): { provider: ProviderId; key?: string; clear: boolean } {
  const [first, ...rest] = args.trim().split(/\s+/);
  if (!first) {
    throw new Error("Usage: /key <provider> [key] or /key <provider> clear");
  }
  const provider = parseProviderId(first);
  const value = rest.join(" ");
  if (value.toLowerCase() === "clear") {
    return { provider, clear: true };
  }
  return { provider, key: value || undefined, clear: false };
}

function streamingAssistantId(): string {
  return `streaming_assistant_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

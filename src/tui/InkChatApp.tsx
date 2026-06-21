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
import {
  errorMessage,
  formatConversationList,
  formatHelp,
  formatModels,
  formatSearchMatches,
  fromMessages,
  notice,
  type DisplayMessage,
  type EditMode,
  type TuiStatus
} from "./state.js";

type InkChatAppProps = {
  app?: ChatApp;
};

export function InkChatApp({ app: providedApp }: InkChatAppProps) {
  const app = useMemo(() => providedApp ?? new ChatApp(), [providedApp]);
  const { exit } = useApp();
  const terminal = useTerminalSize();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [mode, setMode] = useState<EditMode>("chat");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeModel, setActiveModel] = useState<string | undefined>();
  const [contextEstimate, setContextEstimate] = useState<TuiStatus["contextEstimate"]>();

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
      setActiveModel(conversation?.model);
      setContextEstimate(conversation ? estimateContextUsage(conversation) : undefined);
      setMessages([...fromMessages(conversation?.messages ?? []), ...extraMessages]);
    },
    [app]
  );

  useEffect(() => {
    app
      .init()
      .then(() => {
        appendMessage(notice("Ready. Use /new to begin, /help for commands, /exit to leave."));
      })
      .catch((error: unknown) => {
        appendMessage(errorMessage((error as Error).message));
      });
  }, [app, appendMessage]);

  useInput((_, key) => {
    if (key.escape && mode === "edit-user") {
      setMode("chat");
      setInput("");
      appendMessage(notice("Edit cancelled."));
    }
  });

  const submit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) {
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

  const outputHeight = Math.max(8, terminal.rows - 5);

  return (
    <Box flexDirection="column" width={terminal.columns}>
      <OutputBox messages={messages} height={outputHeight} />
      <InputBox
        value={input}
        mode={mode}
        isDisabled={isStreaming}
        onChange={setInput}
        onSubmit={submit}
      />
      <StatusLine status={status} />
    </Box>
  );
}

type CommandContext = {
  app: ChatApp;
  name: string;
  args: string;
  setInput: (value: string) => void;
  setMode: (mode: EditMode) => void;
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  setIsStreaming: (value: boolean) => void;
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
      appendMessage(notice(formatModels(await app.listModels())));
      return false;
    case "new": {
      const conversation = await app.startNew(args || undefined);
      syncFromConversation([notice(`Started ${conversation.id} with ${conversation.model}.`)]);
      return false;
    }
    case "list":
      appendMessage(notice(formatConversationList(await app.listConversations())));
      return false;
    case "load": {
      requireArg(args, "/load <id>");
      const conversation = await app.loadConversation(args);
      syncFromConversation([notice(`Loaded ${conversation.id}: ${conversation.title}`)]);
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
  setActiveModel(conversation?.model);
  setContextEstimate(conversation ? estimateContextUsage(conversation) : undefined);
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
    throw new Error("No active conversation. Use /new [model] or /load <id> first.");
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

import React from "react";
import { Box, Text } from "ink";
import type { DisplayMessage } from "../state.js";
import { MessageView } from "./MessageView.js";

type OutputBoxProps = {
  messages: DisplayMessage[];
  height: number;
};

export function OutputBox({ messages, height }: OutputBoxProps) {
  const visibleMessages = tailMessages(messages, height);

  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1} height={height}>
      {visibleMessages.length === 0 ? (
        <Text color="gray">Use /new to begin, /help for commands, /exit to leave.</Text>
      ) : (
        visibleMessages.map((message) => <MessageView key={message.id} message={message} />)
      )}
    </Box>
  );
}

function tailMessages(messages: DisplayMessage[], height: number): DisplayMessage[] {
  const contentHeight = Math.max(1, height - 2);
  const selected: DisplayMessage[] = [];
  let used = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    const lines = estimateMessageLines(message);
    if (selected.length > 0 && used + lines > contentHeight) {
      break;
    }

    selected.unshift(message);
    used += lines;
  }

  return selected;
}

function estimateMessageLines(message: DisplayMessage): number {
  return Math.max(2, message.content.split(/\r?\n/).length + 2);
}

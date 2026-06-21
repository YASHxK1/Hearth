import React from "react";
import { Box, Text } from "ink";
import { renderMarkdown } from "../../cli/output.js";
import type { DisplayMessage } from "../state.js";

export function MessageView({ message }: { message: DisplayMessage }) {
  const color = colorForRole(message.role);
  const label = labelForRole(message.role);
  const content =
    message.role === "assistant" || message.role === "notice" ? renderMarkdown(message.content) : message.content;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={color} bold>
        {label}
        {message.isStreaming ? " ..." : ""}
      </Text>
      <Text wrap="wrap">{content}</Text>
    </Box>
  );
}

function labelForRole(role: DisplayMessage["role"]): string {
  switch (role) {
    case "assistant":
      return "assistant";
    case "user":
      return "you";
    case "system":
      return "system";
    case "error":
      return "error";
    case "notice":
      return "notice";
  }
}

function colorForRole(role: DisplayMessage["role"]): "blue" | "green" | "gray" | "red" | "yellow" {
  switch (role) {
    case "assistant":
      return "blue";
    case "user":
      return "green";
    case "system":
      return "gray";
    case "error":
      return "red";
    case "notice":
      return "yellow";
  }
}

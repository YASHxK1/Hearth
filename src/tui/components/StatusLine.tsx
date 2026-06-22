import React from "react";
import { Text } from "ink";
import { contextLabel, type TuiStatus } from "../state.js";

export function StatusLine({ status }: { status: TuiStatus }) {
  const model = status.activeModel ?? "No model";
  const mode = modeLabel(status.mode);
  const streaming = status.isStreaming ? " | Streaming" : "";

  return (
    <Text color="gray">
      {mode} | Model: {model} | {contextLabel(status.contextEstimate)}{streaming} | /help
    </Text>
  );
}

function modeLabel(mode: TuiStatus["mode"]): string {
  switch (mode) {
    case "edit-user":
      return "Edit";
    case "select-model":
      return "Select model";
    case "select-conversation":
      return "Select conversation";
    case "chat":
      return "Chat";
  }
}

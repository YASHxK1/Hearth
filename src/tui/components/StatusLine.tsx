import React from "react";
import { Text } from "ink";
import { contextLabel, type TuiStatus } from "../state.js";

export function StatusLine({ status }: { status: TuiStatus }) {
  const model = status.activeModel ?? "No model";
  const mode = status.mode === "edit-user" ? "Edit" : "Chat";
  const streaming = status.isStreaming ? " | Streaming" : "";

  return (
    <Text color="gray">
      {mode} | Model: {model} | {contextLabel(status.contextEstimate)}{streaming} | /help
    </Text>
  );
}

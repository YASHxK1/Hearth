import React from "react";
import { Text } from "ink";
import { contextLabel, type TuiStatus } from "../state.js";
import { PROVIDER_LABELS } from "../../providers/config.js";

export function StatusLine({ status }: { status: TuiStatus }) {
  const model = status.activeModel ?? "No model";
  const provider = status.activeProvider ? PROVIDER_LABELS[status.activeProvider] : "No provider";
  const mode = modeLabel(status.mode);
  const streaming = status.isStreaming ? " | Streaming" : "";

  return (
    <Text color="gray">
      {mode} | {provider} / {model} | {contextLabel(status.contextEstimate)}{streaming} | /help
    </Text>
  );
}

function modeLabel(mode: TuiStatus["mode"]): string {
  switch (mode) {
    case "edit-user":
      return "Edit";
    case "select-model":
      return "Select model";
    case "select-provider":
      return "Select provider";
    case "select-conversation":
      return "Select conversation";
    case "chat":
      return "Chat";
  }
}

import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { TuiMode } from "../state.js";

type InputBoxProps = {
  value: string;
  mode: TuiMode;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
};

export function InputBox({ value, mode, isDisabled, onChange, onSubmit }: InputBoxProps) {
  const placeholder =
    mode === "edit-user"
      ? "Edit last message..."
      : mode === "select-model" || mode === "select-conversation"
        ? "Use picker above..."
        : "Ask anything...";

  return (
    <Box borderStyle="round" paddingX={1} height={3}>
      <Text color="gray">{mode === "edit-user" ? "edit " : "> "}</Text>
      {value.length === 0 ? <Text color="gray">{placeholder}</Text> : null}
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        focus={!isDisabled}
        showCursor={!isDisabled}
      />
    </Box>
  );
}

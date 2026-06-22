import React from "react";
import { Box, Text } from "ink";

export type PickerItem = {
  label: string;
  description?: string;
};

type PickerBoxProps = {
  title: string;
  items: PickerItem[];
  selectedIndex: number;
  emptyText: string;
};

export function PickerBox({ title, items, selectedIndex, emptyText }: PickerBoxProps) {
  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1}>
      <Text bold>{title}</Text>
      {items.length === 0 ? (
        <Text color="gray">{emptyText}</Text>
      ) : (
        items.map((item, index) => (
          <Text key={`${item.label}-${index}`} color={index === selectedIndex ? "cyan" : undefined}>
            {index === selectedIndex ? "> " : "  "}
            {item.label}
            {item.description ? <Text color="gray"> {item.description}</Text> : null}
          </Text>
        ))
      )}
      <Text color="gray">Up/Down to move | Enter to select | Esc to cancel</Text>
    </Box>
  );
}

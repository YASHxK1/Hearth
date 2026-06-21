export type ParsedCommand = {
  name: string;
  args: string;
};

export function parseCommand(input: string): ParsedCommand | undefined {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return undefined;
  }

  const withoutSlash = trimmed.slice(1);
  const firstSpace = withoutSlash.search(/\s/);

  if (firstSpace === -1) {
    return {
      name: withoutSlash.toLowerCase(),
      args: ""
    };
  }

  return {
    name: withoutSlash.slice(0, firstSpace).toLowerCase(),
    args: withoutSlash.slice(firstSpace + 1).trim()
  };
}

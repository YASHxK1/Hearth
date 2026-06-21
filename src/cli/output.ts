import chalk from "chalk";
import hljs from "highlight.js";
import { Lexer, type Tokens } from "marked";
import type { ConversationSummary } from "../storage/schema.js";
import type { ContextEstimate } from "../core/context-usage.js";
import type { SearchMatch } from "../search/search.js";

export function printHelp(): void {
  console.log(`
${chalk.bold("Commands")}
  /help                 Show this help.
  /models               List installed Ollama models.
  /new [model]          Start a new conversation.
  /list                 List saved conversations.
  /load <id>            Load a saved conversation.
  /save                 Save the current conversation.
  /model <name>         Switch the current conversation model.
  /system [prompt]      Set the system prompt. Use /system clear to remove it.
  /search <query>       Search saved conversations.
  /regen                Regenerate the last assistant response.
  /edit                 Edit the last user message and resubmit.
  /clear                Clear the terminal view only.
  /exit                 Save and exit.
`);
}

export function printConversationList(summaries: ConversationSummary[]): void {
  if (summaries.length === 0) {
    console.log(chalk.dim("No saved conversations yet."));
    return;
  }

  for (const summary of summaries) {
    console.log(
      `${chalk.cyan(summary.id)}  ${chalk.bold(summary.title)}  ${chalk.dim(
        `${summary.model} | ${summary.messageCount} messages | ${formatDate(summary.updatedAt)}`
      )}`
    );
  }
}

export function printSearchMatches(matches: SearchMatch[]): void {
  if (matches.length === 0) {
    console.log(chalk.dim("No matches found."));
    return;
  }

  for (const match of matches) {
    console.log(
      `${chalk.cyan(match.conversation.id)}  ${chalk.bold(match.conversation.title)}  ${chalk.dim(
        `${match.conversation.model} | ${formatDate(match.conversation.updatedAt)}`
      )}`
    );
    for (const snippet of match.snippets) {
      console.log(`  ${chalk.dim("-")} ${snippet}`);
    }
  }
}

export function printContextEstimate(estimate: ContextEstimate): void {
  console.log(
    chalk.dim(
      `Approx context: ${estimate.approximateTokens.toLocaleString()} tokens (${estimate.characters.toLocaleString()} chars)`
    )
  );
}

export function renderMarkdown(markdown: string): string {
  const tokens = Lexer.lex(markdown);
  return renderTokens(tokens).trimEnd();
}

function renderTokens(tokens: TokensList): string {
  return tokens.map(renderToken).join("");
}

type TokensList = ReturnType<typeof Lexer.lex>;

function renderToken(token: Tokens.Generic): string {
  switch (token.type) {
    case "heading":
      return `${chalk.bold(renderInlineText(token.text))}\n\n`;
    case "paragraph":
      return `${renderInlineText(token.text)}\n\n`;
    case "space":
      return "\n";
    case "code":
      return `${renderCode(token.text, token.lang)}\n\n`;
    case "blockquote":
      return `${String(token.text)
        .split("\n")
        .map((line) => chalk.dim(`> ${line}`))
        .join("\n")}\n\n`;
    case "list":
      return `${renderList(token as Tokens.List)}\n`;
    case "hr":
      return `${chalk.dim("─".repeat(40))}\n`;
    default:
      if ("raw" in token && typeof token.raw === "string") {
        return token.raw;
      }
      return "";
  }
}

function renderList(token: Tokens.List): string {
  return token.items
    .map((item, index) => {
      const marker = token.ordered ? `${Number(token.start ?? 1) + index}.` : "-";
      const text = renderInlineText(item.text).replace(/\n+$/g, "");
      return `${marker} ${text}`;
    })
    .join("\n");
}

function renderCode(code: string, language?: string): string {
  const highlighted = highlight(code, language);
  const label = language ? chalk.dim(` ${language}`) : "";
  return `${label}\n${highlighted}`;
}

function highlight(code: string, language?: string): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value.replace(/<[^>]+>/g, "");
  }

  try {
    return hljs.highlightAuto(code).value.replace(/<[^>]+>/g, "");
  } catch {
    return code;
  }
}

function renderInlineText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, (_, value: string) => chalk.bold(value))
    .replace(/\*(.+?)\*/g, (_, value: string) => chalk.italic(value))
    .replace(/`(.+?)`/g, (_, value: string) => chalk.yellow(value));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

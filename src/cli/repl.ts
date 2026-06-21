import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ChatApp } from "../core/app.js";
import { parseCommand } from "./commands.js";
import {
  printContextEstimate,
  printConversationList,
  printHelp,
  printSearchMatches,
  renderMarkdown
} from "./output.js";

export async function runRepl(app = new ChatApp()): Promise<void> {
  await app.init();

  const rl = createInterface({ input, output });
  console.log(chalk.bold("Ollama Terminal Chat"));
  console.log(chalk.dim("Use /new to begin, /help for commands, /exit to leave."));

  try {
    while (true) {
      const prompt = app.currentConversation
        ? chalk.green(`${app.currentConversation.model}> `)
        : chalk.green("> ");
      const line = await rl.question(prompt);
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const command = parseCommand(trimmed);
      try {
        if (command) {
          const shouldExit = await handleCommand(command.name, command.args, app, rl);
          if (shouldExit) {
            break;
          }
          continue;
        }

        await runAssistantTurn(app, trimmed);
      } catch (error) {
        console.error(chalk.red((error as Error).message));
      }
    }
  } finally {
    rl.close();
  }
}

async function handleCommand(
  name: string,
  args: string,
  app: ChatApp,
  rl: ReturnType<typeof createInterface>
): Promise<boolean> {
  switch (name) {
    case "help":
      printHelp();
      return false;
    case "models": {
      const models = await app.listModels();
      if (models.length === 0) {
        console.log(chalk.dim("No Ollama models installed."));
      } else {
        for (const model of models) {
          console.log(model.name ?? model.model);
        }
      }
      return false;
    }
    case "new": {
      const conversation = await app.startNew(args || undefined);
      console.log(chalk.dim(`Started ${conversation.id} with ${conversation.model}.`));
      return false;
    }
    case "list":
      printConversationList(await app.listConversations());
      return false;
    case "load": {
      requireArg(args, "/load <id>");
      const conversation = await app.loadConversation(args);
      console.log(chalk.dim(`Loaded ${conversation.id}: ${conversation.title}`));
      printContextEstimate(app.contextEstimate());
      return false;
    }
    case "save":
      await app.saveCurrent();
      console.log(chalk.dim("Saved."));
      return false;
    case "model":
      requireArg(args, "/model <name>");
      await app.switchModel(args);
      console.log(chalk.dim(`Switched to ${args}.`));
      return false;
    case "system":
      if (args.toLowerCase() === "clear") {
        await app.setSystem(undefined);
        console.log(chalk.dim("System prompt cleared."));
      } else if (args) {
        await app.setSystem(args);
        console.log(chalk.dim("System prompt saved."));
      } else {
        const prompt = await rl.question("System prompt: ");
        await app.setSystem(prompt);
        console.log(chalk.dim(prompt.trim() ? "System prompt saved." : "System prompt cleared."));
      }
      return false;
    case "search":
      requireArg(args, "/search <query>");
      printSearchMatches(await app.search(args));
      return false;
    case "regen":
      await runRegeneration(app);
      return false;
    case "edit": {
      const replacement = await rl.question("Replacement message: ");
      if (!replacement.trim()) {
        console.log(chalk.dim("Edit cancelled."));
        return false;
      }
      await runEdit(app, replacement.trim());
      return false;
    }
    case "clear":
      console.clear();
      return false;
    case "exit":
    case "quit":
      if (app.currentConversation) {
        await app.saveCurrent();
      }
      console.log(chalk.dim("Saved. Bye."));
      return true;
    default:
      console.log(chalk.red(`Unknown command: /${name}`));
      printHelp();
      return false;
  }
}

async function runAssistantTurn(app: ChatApp, userMessage: string): Promise<void> {
  process.stdout.write(chalk.blue("assistant: "));
  const result = await app.submitUserMessage(userMessage, (delta) => process.stdout.write(delta));
  process.stdout.write("\n");
  printRenderedResponse(result.assistantContent);
  printContextEstimate(result.context);
}

async function runRegeneration(app: ChatApp): Promise<void> {
  process.stdout.write(chalk.blue("assistant: "));
  const result = await app.regenerate((delta) => process.stdout.write(delta));
  process.stdout.write("\n");
  printRenderedResponse(result.assistantContent);
  printContextEstimate(result.context);
}

async function runEdit(app: ChatApp, replacement: string): Promise<void> {
  process.stdout.write(chalk.blue("assistant: "));
  const result = await app.editLastUserMessage(replacement, (delta) => process.stdout.write(delta));
  process.stdout.write("\n");
  printRenderedResponse(result.assistantContent);
  printContextEstimate(result.context);
}

function printRenderedResponse(content: string): void {
  const rendered = renderMarkdown(content);
  if (rendered && rendered !== content.trim()) {
    console.log(chalk.dim("\nRendered:"));
    console.log(rendered);
  }
}

function requireArg(value: string, usage: string): void {
  if (!value.trim()) {
    throw new Error(`Usage: ${usage}`);
  }
}

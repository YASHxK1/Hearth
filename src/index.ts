#!/usr/bin/env node
import { Command } from "commander";
import { ChatApp } from "./core/app.js";
import { runTui } from "./tui/run.js";
import type { TuiStartupMode } from "./tui/InkChatApp.js";
import { printConversationList } from "./cli/output.js";

const program = new Command();

program
  .name("hearth")
  .description("Persistent terminal chat for local Ollama models.")
  .version("0.1.0")
  .option("--continue", "Load the most recently updated conversation.")
  .option("--resume <id-or-title>", "Load a saved conversation by ID or title.");

program
  .command("chat", { isDefault: true })
  .description("Start the interactive chat TUI.")
  .option("--continue", "Load the most recently updated conversation.")
  .option("--resume <id-or-title>", "Load a saved conversation by ID or title.")
  .action(async (options: StartupOptions) => {
    await runTui({
      startupMode: resolveStartupMode(options, program.opts<StartupOptions>())
    });
  });

program
  .command("models")
  .description("List installed Ollama models.")
  .action(async () => {
    const app = new ChatApp();
    const models = await app.listModels();
    for (const model of models) {
      console.log(model.name ?? model.model);
    }
  });

program
  .command("list")
  .description("List saved conversations.")
  .action(async () => {
    const app = new ChatApp();
    await app.init();
    printConversationList(await app.listConversations());
  });

program.parseAsync().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});

type StartupOptions = {
  continue?: boolean;
  resume?: string;
};

function resolveStartupMode(
  commandOptions: StartupOptions,
  programOptions: StartupOptions
): TuiStartupMode {
  const shouldContinue = Boolean(commandOptions.continue || programOptions.continue);
  const resume = commandOptions.resume ?? programOptions.resume;

  if (shouldContinue && resume) {
    throw new Error("Use either --continue or --resume, not both.");
  }

  if (shouldContinue) {
    return { type: "continue" };
  }

  if (resume) {
    return { type: "resume", reference: resume };
  }

  return { type: "new" };
}

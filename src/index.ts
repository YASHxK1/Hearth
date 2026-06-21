#!/usr/bin/env node
import { Command } from "commander";
import { ChatApp } from "./core/app.js";
import { runTui } from "./tui/run.js";
import { printConversationList } from "./cli/output.js";

const program = new Command();

program
  .name("hearth")
  .description("Persistent terminal chat for local Ollama models.")
  .version("0.1.0");

program
  .command("chat", { isDefault: true })
  .description("Start the interactive chat TUI.")
  .action(async () => {
    await runTui();
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

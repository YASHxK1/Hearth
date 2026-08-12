#!/usr/bin/env node
import { Command } from "commander";
import { ChatApp } from "./core/app.js";
import { runTui } from "./tui/run.js";
import type { TuiStartupMode } from "./tui/InkChatApp.js";
import { printConversationList } from "./cli/output.js";
import { parseProviderId, PROVIDER_IDS } from "./providers/config.js";
import type { ProviderId } from "./providers/types.js";

const program = new Command();

program
  .name("hearth")
  .description("Persistent terminal chat for local model servers.")
  .version("0.1.0")
  .option("--provider <provider>", "Inference provider: ollama, lmstudio, llamacpp, openrouter, or opencodezen.")
  .option("--base-url <url>", "Remember a custom server URL for the selected provider.")
  .option("--ollama-base-url <url>", "Remember the Ollama server URL.")
  .option("--lmstudio-base-url <url>", "Remember the LM Studio server URL.")
  .option("--llamacpp-base-url <url>", "Remember the llama.cpp server URL.")
  .option("--openrouter-base-url <url>", "Remember the OpenRouter server URL.")
  .option("--opencodezen-base-url <url>", "Remember the OpenCode Zen server URL.")
  .option("--openrouter-api-key <key>", "Store the OpenRouter API key in the system keychain.")
  .option("--opencodezen-api-key <key>", "Store the OpenCode Zen API key in the system keychain.")
  .option("--continue", "Load the most recently updated conversation.")
  .option("--resume <id-or-title>", "Load a saved conversation by ID or title.");

program
  .command("chat", { isDefault: true })
  .description("Start the interactive chat TUI.")
  .option("--continue", "Load the most recently updated conversation.")
  .option("--resume <id-or-title>", "Load a saved conversation by ID or title.")
  .option("--provider <provider>", "Inference provider: ollama, lmstudio, llamacpp, openrouter, or opencodezen.")
  .option("--base-url <url>", "Remember a custom server URL for the selected provider.")
  .option("--ollama-base-url <url>", "Remember the Ollama server URL.")
  .option("--lmstudio-base-url <url>", "Remember the LM Studio server URL.")
  .option("--llamacpp-base-url <url>", "Remember the llama.cpp server URL.")
  .option("--openrouter-base-url <url>", "Remember the OpenRouter server URL.")
  .option("--opencodezen-base-url <url>", "Remember the OpenCode Zen server URL.")
  .option("--openrouter-api-key <key>", "Store the OpenRouter API key in the system keychain.")
  .option("--opencodezen-api-key <key>", "Store the OpenCode Zen API key in the system keychain.")
  .action(async (options: StartupOptions) => {
    const providerOptions = resolveProviderOptions(options, program.opts<StartupOptions>());
    await runTui({
      startupMode: resolveStartupMode(options, program.opts<StartupOptions>()),
      ...providerOptions
    });
  });

program
  .command("models")
  .description("List models exposed by the selected provider.")
  .option("--provider <provider>", "Inference provider: ollama, lmstudio, llamacpp, openrouter, or opencodezen.")
  .option("--base-url <url>", "Remember a custom server URL for the selected provider.")
  .option("--ollama-base-url <url>", "Remember the Ollama server URL.")
  .option("--lmstudio-base-url <url>", "Remember the LM Studio server URL.")
  .option("--llamacpp-base-url <url>", "Remember the llama.cpp server URL.")
  .option("--openrouter-base-url <url>", "Remember the OpenRouter server URL.")
  .option("--opencodezen-base-url <url>", "Remember the OpenCode Zen server URL.")
  .option("--openrouter-api-key <key>", "Store the OpenRouter API key in the system keychain.")
  .option("--opencodezen-api-key <key>", "Store the OpenCode Zen API key in the system keychain.")
  .action(async (commandOptions: StartupOptions) => {
    const app = new ChatApp();
    await app.init();
    const options = resolveProviderOptions(commandOptions, program.opts<StartupOptions>());
    await applyProviderOptions(app, options);
    const models = await app.listModels();
    for (const model of models) {
      console.log(model.name ?? model.id);
    }
  });

program
  .command("list")
  .description("List saved conversations.")
  .action(async () => {
    const app = new ChatApp();
    await app.init();
    await applyProviderOptions(app, resolveProviderOptions({}, program.opts<StartupOptions>()));
    printConversationList(await app.listConversations());
  });

program.parseAsync().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});

type StartupOptions = {
  continue?: boolean;
  resume?: string;
  provider?: string;
  baseUrl?: string;
  ollamaBaseUrl?: string;
  lmstudioBaseUrl?: string;
  llamacppBaseUrl?: string;
  openrouterBaseUrl?: string;
  opencodezenBaseUrl?: string;
  openrouterApiKey?: string;
  opencodezenApiKey?: string;
};

function resolveProviderOptions(
  commandOptions: StartupOptions,
  programOptions: StartupOptions
): ProviderOptions {
  const value = commandOptions.provider ?? programOptions.provider;
  return {
    provider: value ? parseProviderId(value) : undefined,
    baseUrl: commandOptions.baseUrl ?? programOptions.baseUrl,
    providerBaseUrls: {
      ollama: commandOptions.ollamaBaseUrl ?? programOptions.ollamaBaseUrl,
      lmstudio: commandOptions.lmstudioBaseUrl ?? programOptions.lmstudioBaseUrl,
      llamacpp: commandOptions.llamacppBaseUrl ?? programOptions.llamacppBaseUrl,
      openrouter: commandOptions.openrouterBaseUrl ?? programOptions.openrouterBaseUrl,
      opencodezen: commandOptions.opencodezenBaseUrl ?? programOptions.opencodezenBaseUrl
    },
    providerApiKeys: {
      openrouter: commandOptions.openrouterApiKey ?? programOptions.openrouterApiKey,
      opencodezen: commandOptions.opencodezenApiKey ?? programOptions.opencodezenApiKey
    }
  };
}

export type ProviderOptions = {
  provider?: ProviderId;
  baseUrl?: string;
  providerBaseUrls: Partial<Record<ProviderId, string>>;
  providerApiKeys?: Partial<Record<ProviderId, string>>;
};

async function applyProviderOptions(app: ChatApp, options: ProviderOptions): Promise<void> {
  for (const provider of PROVIDER_IDS) {
    const url = options.providerBaseUrls[provider];
    if (url) await app.configureProvider(provider, url, false);
  }
  for (const [provider, key] of Object.entries(options.providerApiKeys ?? {}) as Array<
    [ProviderId, string]
  >) {
    if (key) app.setApiKey(provider, key);
  }
  if (options.provider || options.baseUrl) {
    await app.configureProvider(options.provider ?? app.activeProvider, options.baseUrl);
  }
}

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

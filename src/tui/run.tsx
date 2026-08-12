import React from "react";
import { render } from "ink";
import { ChatApp } from "../core/app.js";
import { InkChatApp, type TuiStartupMode } from "./InkChatApp.js";
import type { ProviderId } from "../providers/types.js";

type RunTuiOptions = {
  app?: ChatApp;
  startupMode?: TuiStartupMode;
  provider?: ProviderId;
  baseUrl?: string;
  providerBaseUrls?: Partial<Record<ProviderId, string>>;
  providerApiKeys?: Partial<Record<ProviderId, string>>;
};

export async function runTui(options: RunTuiOptions = {}): Promise<void> {
  const instance = render(
    <InkChatApp
      app={options.app ?? new ChatApp()}
      startupMode={options.startupMode ?? { type: "new" }}
      startupProvider={options.provider}
      startupBaseUrl={options.baseUrl}
      startupProviderBaseUrls={options.providerBaseUrls}
      startupProviderApiKeys={options.providerApiKeys}
    />
  );
  await instance.waitUntilExit();
}

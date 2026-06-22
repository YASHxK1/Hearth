import React from "react";
import { render } from "ink";
import { ChatApp } from "../core/app.js";
import { InkChatApp, type TuiStartupMode } from "./InkChatApp.js";

type RunTuiOptions = {
  app?: ChatApp;
  startupMode?: TuiStartupMode;
};

export async function runTui(options: RunTuiOptions = {}): Promise<void> {
  const instance = render(
    <InkChatApp app={options.app ?? new ChatApp()} startupMode={options.startupMode ?? { type: "new" }} />
  );
  await instance.waitUntilExit();
}

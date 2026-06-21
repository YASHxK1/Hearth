import React from "react";
import { render } from "ink";
import { ChatApp } from "../core/app.js";
import { InkChatApp } from "./InkChatApp.js";

export async function runTui(app = new ChatApp()): Promise<void> {
  const instance = render(<InkChatApp app={app} />);
  await instance.waitUntilExit();
}

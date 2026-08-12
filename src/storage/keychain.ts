import { Entry } from "@napi-rs/keyring";
import type { ProviderId } from "../providers/types.js";

const SERVICE = "hearth";

export interface KeychainStore {
  getApiKey(provider: ProviderId): string | undefined;
  setApiKey(provider: ProviderId, key: string): void;
  clearApiKey(provider: ProviderId): void;
}

export class KeychainKeyStore implements KeychainStore {
  getApiKey(provider: ProviderId): string | undefined {
    try {
      const password = new Entry(SERVICE, provider).getPassword();
      return password && password.length > 0 ? password : undefined;
    } catch {
      return undefined;
    }
  }

  setApiKey(provider: ProviderId, key: string): void {
    new Entry(SERVICE, provider).setPassword(key);
  }

  clearApiKey(provider: ProviderId): void {
    try {
      new Entry(SERVICE, provider).deletePassword();
    } catch {
      // Nothing stored; treat as already cleared.
    }
  }
}

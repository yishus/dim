import { join } from "path";
import { homedir } from "os";
import { readFileSync } from "fs";

interface AuthCredential {
  apiKey?: string;
}

type AuthStorageData = Record<string, AuthCredential>;

const ENV_VAR_MAP: Record<string, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
  openai: ["OPENAI_API_KEY"],
};

class AuthStorage {
  private data: AuthStorageData = {};

  constructor() {
    try {
      const authFilePath = join(homedir(), ".dim", "agent", "auth.json");
      this.data = JSON.parse(readFileSync(authFilePath, "utf-8"));
    } catch {
      // Config file missing or malformed — rely on env vars
    }
  }

  get(provider: string): string | undefined {
    // Env vars take precedence over config file
    const envVars = ENV_VAR_MAP[provider];
    if (envVars) {
      for (const envVar of envVars) {
        const value = process.env[envVar];
        if (value) return value;
      }
    }
    return this.data[provider]?.apiKey;
  }

  hasAnyKey(): boolean {
    // Check env vars
    for (const envVars of Object.values(ENV_VAR_MAP)) {
      for (const envVar of envVars) {
        if (process.env[envVar]) return true;
      }
    }
    // Check config file
    return Object.values(this.data).some((cred) => cred.apiKey);
  }
}

export const authStorage = new AuthStorage();

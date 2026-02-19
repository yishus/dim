#!/usr/bin/env bun
import { useState } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { ALL_MODELS, Session } from "./session";
import type { ModelId } from "./session";
import HomeScreen from "./components/HomeScreen";
import CodingAgent from "./components/CodingAgent";

interface AppProps {
  onExit: () => void;
}

const App = ({ onExit }: AppProps) => {
  const [sessionState, setSessionState] = useState<"startup" | "started">(
    "startup",
  );
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);

  const handleInitialPromptSubmitted = async (
    prompt: string,
    modelId: string,
  ) => {
    const newSession = await Session.create();
    const model = ALL_MODELS.find((m) => m.id === modelId);
    if (model) {
      newSession.setModel(model.id as ModelId, model.provider);
    }
    setSession(newSession);
    setInitialPrompt(prompt);
    setSessionState("started");
  };

  return (
    <>
      {sessionState == "startup" && (
        <HomeScreen
          initialPromptSubmitted={handleInitialPromptSubmitted}
          onExit={onExit}
        />
      )}
      {sessionState == "started" && session && (
        <CodingAgent
          session={session}
          userPrompt={initialPrompt}
          onExit={onExit}
        />
      )}
    </>
  );
};

const renderer = await createCliRenderer();

const handleExit = () => {
  renderer.destroy();
  process.exit(0);
};

createRoot(renderer).render(<App onExit={handleExit} />);

#!/usr/bin/env bun
import { useEffect, useState } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { Session } from "./session";
import CodingAgent from "./components/CodingAgent";
import "./components/StyledBox";

interface AppProps {
  onExit: () => void;
}

const App = ({ onExit }: AppProps) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const createSession = async () => {
      try {
        const newSession = await Session.create();
        setSession(newSession);
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    createSession();
  }, []);

  if (session == undefined) {
    return;
  }

  return <CodingAgent session={session} onExit={onExit} />;
};

const renderer = await createCliRenderer();

const handleExit = () => {
  renderer.destroy();
  process.exit(0);
};

createRoot(renderer).render(<App onExit={handleExit} />);

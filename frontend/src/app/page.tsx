"use client";

import { useState, useEffect } from "react";
import { SetupFlow } from "@/components/setup-flow";
import { AppShell } from "@/components/app-shell";

export type AppScreen = "setup" | "main";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen | null>(null);

  // On boot: check if a workspace already exists and skip setup if so.
  useEffect(() => {
    fetch("/api/workspace")
      .then((res) => {
        if (res.ok) {
          setScreen("main");
        } else {
          setScreen("setup");
        }
      })
      .catch(() => setScreen("setup"));
  }, []);

  if (screen === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {screen === "setup" && (
        <SetupFlow onComplete={() => setScreen("main")} />
      )}
      {screen === "main" && <AppShell />}
    </div>
  );
}

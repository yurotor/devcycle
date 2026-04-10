"use client";

import { useState } from "react";
import { SetupFlow } from "@/components/setup-flow";
import { ScanningView } from "@/components/scanning-view";
import { AppShell } from "@/components/app-shell";

export type AppScreen = "setup" | "scanning" | "main";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("setup");

  return (
    <div className="h-full">
      {screen === "setup" && (
        <SetupFlow onComplete={() => setScreen("scanning")} />
      )}
      {screen === "scanning" && (
        <ScanningView onComplete={() => setScreen("main")} />
      )}
      {screen === "main" && <AppShell />}
    </div>
  );
}

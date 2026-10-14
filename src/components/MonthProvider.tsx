"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { currentMonth } from "@/lib/format";

type MonthState = { month: string; setMonth: (m: string) => void };

const MonthContext = createContext<MonthState | null>(null);

export function useMonth() {
  const ctx = use(MonthContext);
  if (!ctx) throw new Error("useMonth precisa estar dentro de MonthProvider");
  return ctx;
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth);
  return <MonthContext value={{ month, setMonth }}>{children}</MonthContext>;
}

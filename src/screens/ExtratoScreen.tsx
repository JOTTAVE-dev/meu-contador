"use client";

import { Search, SearchX } from "lucide-react";
import { useState } from "react";
import { useMonth } from "@/components/MonthProvider";
import { MovementRow, toMovements, type Movement } from "@/components/Rows";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { METHODS } from "@/lib/constants";
import { useCards, useIncomes, useInstallments } from "@/lib/data";
import { money } from "@/lib/format";
import type { Method } from "@/lib/types";

type Filter = "all" | "income" | "expense" | Method;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "income", label: "Entradas" },
  { id: "expense", label: "Saídas" },
  ...METHODS.map((m) => ({ id: m.id, label: m.label })),
];

function matches(m: Movement, filter: Filter, query: string) {
  if (filter === "income" && m.kind !== "income") return false;
  if (filter === "expense" && m.kind !== "expense") return false;
  if (!["all", "income", "expense"].includes(filter) && (m.kind !== "expense" || m.item.method !== filter)) return false;
  if (!query) return true;
  const text =
    m.kind === "income"
      ? `${m.income.description} ${m.income.category}`
      : `${m.item.expense.description} ${m.item.expense.place ?? ""} ${m.item.expense.category}`;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function ExtratoScreen() {
  const { month } = useMonth();
  const incomes = useIncomes(month);
  const installments = useInstallments(month);
  const { data: cards } = useCards();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const loading = !incomes.data || !installments.data;
  const list = toMovements(incomes.data, installments.data).filter((m) => matches(m, filter, query.trim()));
  const total = list.reduce((s, m) => s + (m.kind === "income" ? m.income.amount : -m.item.amount), 0);

  return (
    <>
      <PageHeader title="Extrato" />
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Buscar por descrição, loja ou categoria"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-80" />
        ) : list.length === 0 ? (
          <Empty icon={<SearchX className="size-6" />} text="Nenhum lançamento encontrado neste mês." />
        ) : (
          <>
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-muted">
                {list.length} {list.length === 1 ? "lançamento" : "lançamentos"}
              </span>
              <span className={`font-semibold ${total >= 0 ? "text-pos" : "text-fg"}`}>{money(total)}</span>
            </div>
            <div className="card divide-y divide-line overflow-hidden">
              {list.map((m) => (
                <MovementRow key={m.kind === "income" ? m.income.id : m.item.id} m={m} cards={cards} />
              ))}
            </div>
            {list.some((m) => m.kind === "expense" && m.item.method === "credito") && (
              <p className="px-1 text-xs text-muted">
                Compras no crédito aparecem no mês em que a fatura vence, com a data da compra.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}

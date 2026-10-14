"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { fetchExpense } from "@/lib/data";
import { dayInMonth, monthStart, todayISO } from "@/lib/format";
import type { Bill, Card, Income } from "@/lib/types";
import { BillForm } from "./BillForm";
import { CardForm } from "./CardForm";
import { TransactionForm, type TransactionInitial } from "./TransactionForm";
import { Sheet } from "./ui";

type Panel =
  | { type: "transaction"; initial: TransactionInitial }
  | { type: "card"; card?: Card }
  | { type: "bill"; bill?: Bill };

type Editor = {
  newTransaction: () => void;
  editExpense: (id: string) => Promise<void>;
  editIncome: (income: Income) => void;
  payBill: (bill: Bill, month: string) => void;
  editCard: (card?: Card) => void;
  editBill: (bill?: Bill) => void;
};

const EditorContext = createContext<Editor | null>(null);

export function useEditor() {
  const ctx = use(EditorContext);
  if (!ctx) throw new Error("useEditor precisa estar dentro de EditorProvider");
  return ctx;
}

/** Abre os formulários (em painel deslizante) a partir de qualquer tela. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const [panel, setPanelState] = useState<(Panel & { key: number }) | null>(null);
  const close = useCallback(() => setPanelState(null), []);
  // chave nova a cada abertura para o formulário começar com estado limpo
  const setPanel = useCallback((p: Panel) => setPanelState({ ...p, key: Date.now() }), []);

  const editor = useMemo<Editor>(
    () => ({
      newTransaction: () => setPanel({ type: "transaction", initial: { kind: "expense" } }),
      editExpense: async (id) => {
        const expense = await fetchExpense(id);
        setPanel({ type: "transaction", initial: { kind: "expense", id, values: expense } });
      },
      editIncome: (income) =>
        setPanel({ type: "transaction", initial: { kind: "income", id: income.id, values: income } }),
      payBill: (bill, month) => {
        const today = todayISO();
        setPanel({
          type: "transaction",
          initial: {
            kind: "expense",
            values: {
              description: bill.name,
              amount: bill.amount,
              method: bill.method,
              card_id: bill.card_id,
              category: bill.category,
              date: today.startsWith(month) ? today : dayInMonth(month, bill.due_day),
              bill_id: bill.id,
              bill_month: monthStart(month),
            },
          },
        });
      },
      editCard: (card) => setPanel({ type: "card", card }),
      editBill: (bill) => setPanel({ type: "bill", bill }),
    }),
    [setPanel],
  );

  const titles: Record<Panel["type"], string> = {
    transaction:
      panel?.type === "transaction" && panel.initial.id
        ? "Editar lançamento"
        : panel?.type === "transaction" && panel.initial.kind === "expense" && panel.initial.values?.bill_id
          ? "Pagar conta"
          : "Novo lançamento",
    card: panel?.type === "card" && panel.card ? "Editar cartão" : "Novo cartão",
    bill: panel?.type === "bill" && panel.bill ? "Editar conta fixa" : "Nova conta fixa",
  };

  return (
    <EditorContext value={editor}>
      {children}
      {panel && (
        <Sheet key={panel.key} title={titles[panel.type]} onClose={close}>
          {panel.type === "transaction" && (
            <TransactionForm initial={panel.initial} onDone={close} onOpenCards={() => setPanel({ type: "card" })} />
          )}
          {panel.type === "card" && <CardForm card={panel.card} onDone={close} />}
          {panel.type === "bill" && <BillForm bill={panel.bill} onDone={close} />}
        </Sheet>
      )}
    </EditorContext>
  );
}

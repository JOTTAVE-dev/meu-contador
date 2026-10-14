"use client";

import { CategoryIcon, methodLabel } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import type { Card, Income, Installment } from "@/lib/types";
import { useEditor } from "./Editor";

export type Movement =
  | { kind: "income"; date: string; income: Income }
  | { kind: "expense"; date: string; item: Installment };

/** Junta entradas e parcelas do mês numa lista só, da mais recente pra mais antiga. */
export function toMovements(incomes: Income[] = [], installments: Installment[] = []): Movement[] {
  return [
    ...incomes.map((income) => ({ kind: "income" as const, date: income.date, income })),
    ...installments.map((item) => ({ kind: "expense" as const, date: item.expense.date, item })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function MovementRow({ m, cards }: { m: Movement; cards?: Card[] }) {
  const { editExpense, editIncome } = useEditor();

  if (m.kind === "income") {
    return (
      <Row
        icon={<CategoryIcon category={m.income.category} income className="size-5" />}
        iconClass="bg-pos/12 text-pos"
        title={m.income.description}
        subtitle={[m.income.category, dateShort(m.income.date)]}
        amount={<span className="text-pos">+{money(m.income.amount)}</span>}
        onClick={() => editIncome(m.income)}
      />
    );
  }

  const { item } = m;
  const e = item.expense;
  const card = cards?.find((c) => c.id === item.card_id);
  return (
    <Row
      icon={<CategoryIcon category={e.category} className="size-5" />}
      iconClass="bg-surface-2 text-fg"
      title={e.description}
      subtitle={[
        e.place,
        card ? card.name : methodLabel(item.method),
        item.total > 1 ? `${item.number}/${item.total}` : null,
        dateShort(e.date),
      ]}
      amount={<span>−{money(item.amount)}</span>}
      onClick={() => editExpense(e.id)}
    />
  );
}

function Row({
  icon,
  iconClass,
  title,
  subtitle,
  amount,
  onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: (string | null | undefined)[];
  amount: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 active:bg-surface-2"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle.filter(Boolean).join(" · ")}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{amount}</span>
    </button>
  );
}

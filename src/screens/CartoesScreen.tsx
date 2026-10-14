"use client";

import { CreditCard, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/components/Editor";
import { useMonth } from "@/components/MonthProvider";
import { MovementRow } from "@/components/Rows";
import { Empty, PageHeader, Section, Skeleton } from "@/components/ui";
import { useCards, useCreditInstallments } from "@/lib/data";
import {
  addMonths,
  currentMonth,
  dateShort,
  dayInMonth,
  money,
  moneyCompact,
  monthShort,
  monthStart,
  todayISO,
} from "@/lib/format";
import type { Card } from "@/lib/types";

const CHART_MONTHS = 6;

export function CartoesScreen() {
  const { month } = useMonth();
  const { editCard } = useEditor();
  const { data: cards } = useCards();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const card = cards?.find((c) => c.id === selectedId) ?? cards?.[0];

  return (
    <>
      <PageHeader
        title="Cartões"
        action={
          <button className="btn-icon" onClick={() => editCard()} aria-label="Novo cartão">
            <Plus className="size-5" />
          </button>
        }
      />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-4">
        {!cards ? (
          <Skeleton className="h-44" />
        ) : cards.length === 0 ? (
          <Empty
            icon={<CreditCard className="size-6" />}
            text="Cadastre seu cartão com o dia de fechamento e de vencimento para as parcelas caírem na fatura certa."
            action={
              <button className="btn-primary" onClick={() => editCard()}>
                Adicionar cartão
              </button>
            }
          />
        ) : (
          <>
            <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
              {cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex aspect-[1.7] w-64 shrink-0 snap-start flex-col justify-between rounded-2xl p-4 text-left text-white shadow-lg transition ${
                    card?.id === c.id ? "" : "scale-[0.94] opacity-55"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${c.color}, color-mix(in oklab, ${c.color} 55%, black))` }}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <CreditCard className="size-5 opacity-80" />
                  </span>
                  <span className="text-xs opacity-80">
                    Fecha dia {c.closing_day} · Vence dia {c.due_day}
                  </span>
                </button>
              ))}
            </div>
            {card && <CardDetails key={card.id} card={card} month={month} onEdit={() => editCard(card)} />}
          </>
        )}
      </main>
    </>
  );
}

function CardDetails({ card, month, onEdit }: { card: Card; month: string; onEdit: () => void }) {
  const range = useCreditInstallments(month, CHART_MONTHS);
  // para o limite: tudo que ainda vai vencer a partir deste mês
  const future = useCreditInstallments(currentMonth(), 72);

  if (!range.data) return <Skeleton className="h-72" />;

  const mine = range.data.filter((i) => i.card_id === card.id);
  const invoiceItems = mine.filter((i) => i.ref_month === monthStart(month));
  const invoiceTotal = invoiceItems.reduce((s, i) => s + Number(i.amount), 0);

  const dueDate = dayInMonth(month, card.due_day);
  const closingMonth = card.due_day > card.closing_day ? month : addMonths(month, -1);
  const closingDate = dayInMonth(closingMonth, card.closing_day);
  const today = todayISO();
  const status = today > dueDate ? "Já venceu" : today >= closingDate ? "Fechada" : "Aberta";

  // faturas que já venceram são consideradas pagas e liberam o limite
  const firstOpen = monthStart(
    Number(today.slice(8)) > card.due_day ? addMonths(currentMonth(), 1) : currentMonth(),
  );
  const used = (future.data ?? [])
    .filter((i) => i.card_id === card.id && i.ref_month >= firstOpen)
    .reduce((s, i) => s + Number(i.amount), 0);
  const limit = card.limit_amount ?? 0;

  const columns = Array.from({ length: CHART_MONTHS }, (_, k) => {
    const m = addMonths(month, k);
    return {
      month: m,
      value: mine.filter((i) => i.ref_month === monthStart(m)).reduce((s, i) => s + Number(i.amount), 0),
    };
  });
  const max = Math.max(...columns.map((c) => c.value), 1);

  return (
    <>
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Fatura de {monthShort(month)}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{money(invoiceTotal)}</p>
          </div>
          <button className="btn-icon" onClick={onEdit} aria-label="Editar cartão">
            <Pencil className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              status === "Aberta" ? "bg-pos/12 text-pos" : status === "Fechada" ? "bg-warn/12 text-warn" : "bg-surface-2 text-muted"
            }`}
          >
            {status}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">Fecha {dateShort(closingDate)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">Vence {dateShort(dueDate)}</span>
        </div>

        {limit > 0 && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">Limite usado</span>
              <span>
                {money(used)} de {money(limit)}
              </span>
            </div>
            <div className="h-2 rounded-r bg-track" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
              <div
                className={`h-2 rounded-r ${used / limit > 0.9 ? "bg-neg" : used / limit > 0.7 ? "bg-warn" : "bg-bar"}`}
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">Disponível: {money(Math.max(0, limit - used))}</p>
          </div>
        )}
      </div>

      <Section title="Próximas faturas">
        <div className="card p-4">
          <div className="flex h-44 items-end justify-around gap-2">
            {columns.map((c, k) => (
              <div
                key={c.month}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                title={`Fatura de ${monthShort(c.month)}: ${money(c.value)}`}
              >
                <span className="text-[11px] whitespace-nowrap text-muted tabular-nums">
                  {c.value > 0 ? moneyCompact(c.value).replace("R$", "").trim() : "–"}
                </span>
                <div
                  className={`w-6 rounded-t bg-bar ${k === 0 ? "" : "opacity-70"}`}
                  style={{ height: `${(c.value / max) * 110}px` }}
                />
                <span className={`text-xs ${k === 0 ? "font-semibold text-fg" : "text-muted"}`}>{monthShort(c.month)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title={`Compras na fatura (${invoiceItems.length})`}>
        {invoiceItems.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Nenhuma compra nesta fatura.</p>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {invoiceItems.map((item) => (
              <MovementRow key={item.id} m={{ kind: "expense", date: item.expense.date, item }} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

"use client";

import { CheckCircle2, CircleDashed, Pencil, Plus, Receipt } from "lucide-react";
import { useEditor } from "@/components/Editor";
import { useMonth } from "@/components/MonthProvider";
import { Empty, PageHeader, Section, Skeleton } from "@/components/ui";
import { methodLabel } from "@/lib/constants";
import { db, useBills, useCards, usePaidBills } from "@/lib/data";
import { currentMonth, money, todayISO } from "@/lib/format";
import type { Bill } from "@/lib/types";

export function ContasScreen() {
  const { month } = useMonth();
  const { editBill, payBill, editExpense } = useEditor();
  const bills = useBills();
  const paid = usePaidBills(month);
  const { data: cards } = useCards();

  if (!bills.data || !paid.data) {
    return (
      <>
        <PageHeader title="Contas fixas" />
        <main className="mx-auto max-w-2xl px-4 pt-4">
          <Skeleton className="h-72" />
        </main>
      </>
    );
  }

  const active = bills.data.filter((b) => b.active);
  const inactive = bills.data.filter((b) => !b.active);
  const paidByBill = new Map(paid.data.map((p) => [p.bill_id, p]));
  const paidTotal = paid.data.reduce((s, p) => s + Number(p.amount), 0);
  const pendingTotal = active.filter((b) => !paidByBill.has(b.id)).reduce((s, b) => s + Number(b.amount), 0);

  const isCurrent = month === currentMonth();
  const isPast = month < currentMonth();
  const today = Number(todayISO().slice(8));

  async function undo(bill: Bill) {
    const payment = paidByBill.get(bill.id);
    if (payment && confirm(`Desfazer o pagamento de ${bill.name}? O lançamento será excluído.`)) {
      await db.deleteExpense(payment.id);
    }
  }

  function renderBill(b: Bill) {
    const payment = paidByBill.get(b.id);
    const late = !payment && b.active && (isPast || (isCurrent && b.due_day < today));
    const card = cards?.find((c) => c.id === b.card_id);
    return (
      <div key={b.id} className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => (payment ? undo(b) : payBill(b, month))}
          aria-label={payment ? "Desfazer pagamento" : "Marcar como paga"}
          className={`shrink-0 transition active:scale-90 ${payment ? "text-pos" : late ? "text-neg" : "text-muted"}`}
        >
          {payment ? <CheckCircle2 className="size-7" /> : <CircleDashed className="size-7" />}
        </button>
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => (payment ? editExpense(payment.id) : payBill(b, month))}
        >
          <span className={`block truncate font-medium ${payment ? "text-muted line-through" : ""}`}>{b.name}</span>
          <span className={`block truncate text-xs ${late ? "text-neg" : "text-muted"}`}>
            {payment ? "Paga" : late ? "Atrasada" : `Vence dia ${b.due_day}`} · {card ? card.name : methodLabel(b.method)}
          </span>
        </button>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{money(payment ? payment.amount : b.amount)}</span>
        <button className="btn-icon size-8" onClick={() => editBill(b)} aria-label={`Editar ${b.name}`}>
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Contas fixas"
        action={
          <button className="btn-icon" onClick={() => editBill()} aria-label="Nova conta fixa">
            <Plus className="size-5" />
          </button>
        }
      />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-4">
        {bills.data.length === 0 ? (
          <Empty
            icon={<Receipt className="size-6" />}
            text="Cadastre as contas que se repetem todo mês (aluguel, luz, internet, academia...) e marque como pagas a cada mês."
            action={
              <button className="btn-primary" onClick={() => editBill()}>
                Adicionar conta fixa
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-xs text-muted">Pagas</p>
                <p className="mt-1 text-xl font-semibold">{money(paidTotal)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted">Falta pagar</p>
                <p className="mt-1 text-xl font-semibold">{money(pendingTotal)}</p>
              </div>
            </div>

            <Section title={`Contas do mês (${active.length})`}>
              <div className="card divide-y divide-line overflow-hidden">{active.map(renderBill)}</div>
              <p className="px-1 text-xs text-muted">
                Toque no círculo para registrar o pagamento. Ele entra como saída no extrato.
              </p>
            </Section>

            {inactive.length > 0 && (
              <Section title="Inativas">
                <div className="card divide-y divide-line overflow-hidden opacity-70">{inactive.map(renderBill)}</div>
              </Section>
            )}
          </>
        )}
      </main>
    </>
  );
}

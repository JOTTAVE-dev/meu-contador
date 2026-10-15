"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CreditCard,
  LogOut,
  QrCode,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useEditor } from "@/components/Editor";
import { useMonth } from "@/components/MonthProvider";
import { MovementRow, toMovements } from "@/components/Rows";
import { BarList, Empty, PageHeader, Section, Skeleton } from "@/components/ui";
import { CategoryIcon } from "@/lib/constants";
import { useBills, useCards, useIncomes, useInstallments, usePaidBills } from "@/lib/data";
import { currentMonth, money, todayISO } from "@/lib/format";
import type { Installment } from "@/lib/types";

export function HomeScreen() {
  const { month } = useMonth();
  const { signOut, email } = useAuth();
  const { newTransaction, payBill } = useEditor();

  const incomes = useIncomes(month);
  const installments = useInstallments(month);
  const bills = useBills();
  const paid = usePaidBills(month);
  const { data: cards } = useCards();

  const loading = !incomes.data || !installments.data;
  const totalIn = sum(incomes.data?.map((i) => i.amount));
  const totalOut = sum(installments.data?.map((i) => i.amount));
  const balance = totalIn - totalOut;

  const paidIds = new Set(paid.data?.map((p) => p.bill_id));
  const pendingBills = (bills.data ?? []).filter((b) => b.active && !paidIds.has(b.id));
  const pendingTotal = sum(pendingBills.map((b) => b.amount));

  const byCategory = groupSum(installments.data ?? [], (i) => i.expense.category);
  const methodTotal = (...methods: string[]) =>
    sum(installments.data?.filter((i) => methods.includes(i.method)).map((i) => i.amount));
  const pixDebit = methodTotal("pix", "debito");
  const others = methodTotal("dinheiro", "boleto");
  const movements = toMovements(incomes.data, installments.data);
  const isCurrent = month === currentMonth();
  const today = Number(todayISO().slice(8));

  return (
    <>
      <PageHeader
        title="Resumo"
        action={
          <button
            className="btn-icon"
            title={`Sair (${email})`}
            aria-label="Sair"
            onClick={() => confirm("Sair da conta?") && signOut()}
          >
            <LogOut className="size-5" />
          </button>
        }
      />

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-4">
        {loading ? (
          <Skeleton className="h-52" />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-[#4c1d95] p-5 text-white shadow-xl shadow-brand/20">
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm text-white/75">Saldo do mês</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">{money(balance)}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <p className="flex items-center gap-1.5 text-xs text-white/75">
                  <ArrowDownLeft className="size-3.5" /> Entradas
                </p>
                <p className="mt-0.5 text-lg font-semibold">{money(totalIn)}</p>
              </div>
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <p className="flex items-center gap-1.5 text-xs text-white/75">
                  <ArrowUpRight className="size-3.5" /> Saídas
                </p>
                <p className="mt-0.5 text-lg font-semibold">{money(totalOut)}</p>
              </div>
            </div>

            {pendingTotal > 0 && (
              <p className="mt-4 text-sm text-white/80">
                Ainda faltam {money(pendingTotal)} em contas fixas · sobra prevista{" "}
                <b className="text-white">{money(balance - pendingTotal)}</b>
              </p>
            )}
          </div>
        )}

        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <Section title="Gastos do mês">
            <div className="grid grid-cols-2 gap-3">
              <div className="card col-span-2 flex items-center gap-4 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Wallet className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted">Total gasto</p>
                  <p className="text-2xl font-semibold tracking-tight">{money(totalOut)}</p>
                  <p className="text-xs text-muted">
                    {installments.data!.length} {installments.data!.length === 1 ? "lançamento" : "lançamentos"}
                  </p>
                </div>
              </div>

              <SpendCard
                icon={<QrCode className="size-4" />}
                label="Débito + Pix"
                value={pixDebit}
                note="Sai direto da conta"
              />

              {cards?.map((c) => (
                <SpendCard
                  key={c.id}
                  color={c.color}
                  icon={<CreditCard className="size-4" />}
                  label={c.name}
                  value={sum(installments.data!.filter((i) => i.card_id === c.id).map((i) => i.amount))}
                  note={`Fatura · vence dia ${c.due_day}`}
                />
              ))}

              {others > 0 && (
                <SpendCard
                  icon={<Banknote className="size-4" />}
                  label="Dinheiro e boleto"
                  value={others}
                />
              )}
            </div>
            {cards?.length === 0 && (
              <p className="px-1 text-xs text-muted">
                Cadastre seus cartões em <Link href="/cartoes" className="text-brand">Cartões</Link> para ver o gasto de cada um aqui.
              </p>
            )}
          </Section>
        )}

        {!loading && movements.length === 0 && pendingBills.length === 0 && (
          <Empty
            icon={<Sparkles className="size-6" />}
            text="Nada lançado neste mês ainda. Comece pelo seu salário e pelos gastos do dia a dia."
            action={
              <button className="btn-primary" onClick={newTransaction}>
                Adicionar lançamento
              </button>
            }
          />
        )}

        {pendingBills.length > 0 && (
          <Section
            title="Contas a pagar"
            action={
              <Link href="/contas" className="text-sm text-brand">
                Ver todas
              </Link>
            }
          >
            <div className="card divide-y divide-line overflow-hidden">
              {pendingBills.slice(0, 4).map((b) => {
                const late = isCurrent && b.due_day < today;
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                        late ? "bg-neg/12 text-neg" : "bg-surface-2 text-muted"
                      }`}
                    >
                      <CalendarClock className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{b.name}</span>
                      <span className={`block text-xs ${late ? "text-neg" : "text-muted"}`}>
                        {late ? "Atrasada · " : ""}vence dia {b.due_day} · {money(b.amount)}
                      </span>
                    </span>
                    <button className="chip" onClick={() => payBill(b, month)}>
                      Pagar
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {byCategory.length > 0 && (
          <Section title="Gastos por categoria">
            <div className="card p-4">
              <BarList
                items={byCategory.map(([cat, value]) => ({
                  key: cat,
                  label: cat,
                  value,
                  icon: <CategoryIcon category={cat} className="size-4" />,
                }))}
              />
            </div>
          </Section>
        )}

        {movements.length > 0 && (
          <Section
            title="Últimos lançamentos"
            action={
              <Link href="/lancamentos" className="text-sm text-brand">
                Ver extrato
              </Link>
            }
          >
            <div className="card divide-y divide-line overflow-hidden">
              {movements.slice(0, 6).map((m) => (
                <MovementRow key={m.kind === "income" ? m.income.id : m.item.id} m={m} cards={cards} />
              ))}
            </div>
          </Section>
        )}
      </main>
    </>
  );
}

function SpendCard({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note?: string;
  color?: string;
}) {
  return (
    <div className="card relative overflow-hidden p-4">
      {color && <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 text-lg font-semibold">{money(value)}</p>
      {note && <p className="truncate text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function sum(values: number[] = []) {
  return values.reduce((s, v) => s + Number(v), 0);
}

function groupSum(list: Installment[], key: (i: Installment) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const item of list) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + Number(item.amount));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

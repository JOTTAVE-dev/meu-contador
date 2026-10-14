"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, INSTALLABLE, METHODS } from "@/lib/constants";
import { db, useCards } from "@/lib/data";
import {
  addMonths,
  dayInMonth,
  firstInvoiceMonth,
  money,
  monthLabel,
  splitInstallments,
  todayISO,
} from "@/lib/format";
import type { Expense, Income, Method } from "@/lib/types";
import { MoneyInput, Segmented, Stepper } from "./ui";

export type TransactionInitial =
  | { kind: "expense"; id?: string; values?: Partial<Expense> }
  | { kind: "income"; id?: string; values?: Partial<Income> };

export function TransactionForm({
  initial,
  onDone,
  onOpenCards,
}: {
  initial: TransactionInitial;
  onDone: () => void;
  onOpenCards: () => void;
}) {
  const editing = Boolean(initial.id);
  const exp = initial.kind === "expense" ? initial.values : undefined;
  const inc = initial.kind === "income" ? initial.values : undefined;

  const [kind, setKind] = useState(initial.kind);
  const [amount, setAmount] = useState(initial.values?.amount ?? 0);
  const [description, setDescription] = useState(initial.values?.description ?? "");
  const [place, setPlace] = useState(exp?.place ?? "");
  const [date, setDate] = useState(initial.values?.date ?? todayISO());
  const [expenseCategory, setExpenseCategory] = useState(exp?.category ?? "Alimentação");
  const [incomeCategory, setIncomeCategory] = useState(inc?.category ?? "Salário");
  const [method, setMethod] = useState<Method>(exp?.method ?? "pix");
  const [cardId, setCardId] = useState(exp?.card_id ?? "");
  const [installments, setInstallments] = useState(exp?.installments ?? 1);
  const [repeat, setRepeat] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: cards } = useCards();
  const card = cards?.find((c) => c.id === cardId) ?? (method === "credito" ? cards?.[0] : undefined);
  const canInstall = kind === "expense" && INSTALLABLE.includes(method);
  const n = canInstall ? installments : 1;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amount <= 0) return setError("Informe o valor.");
    if (!description.trim()) return setError(kind === "expense" ? "Diga o que foi comprado." : "Dê um nome para a entrada.");
    if (kind === "expense" && method === "credito" && !card) return setError("Cadastre um cartão de crédito primeiro.");

    setSaving(true);
    try {
      if (kind === "expense") {
        await db.saveExpense(
          {
            description: description.trim(),
            place: place.trim() || null,
            amount,
            date,
            method,
            card_id: method === "credito" ? card!.id : null,
            installments: n,
            category: expenseCategory,
            bill_id: exp?.bill_id ?? null,
            bill_month: exp?.bill_month ?? null,
          },
          initial.kind === "expense" ? initial.id : undefined,
        );
      } else if (editing) {
        await db.saveIncome({ description: description.trim(), amount, date, category: incomeCategory }, initial.id);
      } else {
        const month = date.slice(0, 7);
        const day = Number(date.slice(8));
        await db.insertIncomes(
          Array.from({ length: repeat }, (_, i) => ({
            description: description.trim(),
            amount,
            date: i === 0 ? date : dayInMonth(addMonths(month, i), day),
            category: incomeCategory,
          })),
        );
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    const msg =
      kind === "expense" && (exp?.installments ?? 1) > 1
        ? `Excluir esta compra e todas as ${exp?.installments} parcelas?`
        : "Excluir este lançamento?";
    if (!initial.id || !confirm(msg)) return;
    setSaving(true);
    try {
      await (kind === "expense" ? db.deleteExpense(initial.id) : db.deleteIncome(initial.id));
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const split = splitInstallments(amount, n);
  const firstMonth =
    method === "credito" && card ? firstInvoiceMonth(date, card.closing_day, card.due_day) : date.slice(0, 7);

  return (
    <form onSubmit={save} className="space-y-5">
      {!editing && (
        <Segmented
          options={[
            { id: "expense", label: "Saída" },
            { id: "income", label: "Entrada" },
          ]}
          value={kind}
          onChange={setKind}
        />
      )}

      <div className={`rounded-2xl py-5 ${kind === "expense" ? "bg-neg/10" : "bg-pos/10"}`}>
        <p className="mb-1 text-center text-xs text-muted">{n > 1 ? "Valor total da compra" : "Valor"}</p>
        <MoneyInput value={amount} onChange={setAmount} big autoFocus={!editing} />
      </div>

      <label className="block space-y-1.5">
        <span className="label">{kind === "expense" ? "O que foi?" : "Descrição"}</span>
        <input
          className="input"
          placeholder={kind === "expense" ? "Ex.: Tênis, almoço, conta de luz" : "Ex.: Salário"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {kind === "expense" && (
          <label className="block space-y-1.5">
            <span className="label">Onde?</span>
            <input
              className="input"
              placeholder="Loja, site, lugar"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={80}
            />
          </label>
        )}
        <label className={`block space-y-1.5 ${kind === "income" ? "col-span-2" : ""}`}>
          <span className="label">{kind === "expense" ? "Dia da compra" : "Dia"}</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {kind === "expense" && (
        <div className="space-y-2">
          <span className="label">Forma de pagamento</span>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chip"
                aria-pressed={method === m.id}
                onClick={() => setMethod(m.id)}
              >
                <m.icon className="size-4" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === "expense" && method === "credito" && (
        <div className="space-y-2">
          <span className="label">Cartão</span>
          {cards && cards.length === 0 ? (
            <button type="button" className="btn-ghost w-full" onClick={onOpenCards}>
              Cadastrar um cartão
            </button>
          ) : (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {cards?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={card?.id === c.id}
                  onClick={() => setCardId(c.id)}
                >
                  <span className="size-3 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {canInstall && (
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Parcelas</span>
            <Stepper value={installments} onChange={setInstallments} suffix="x" />
          </div>
          {amount > 0 && (
            <p className="text-sm text-muted">
              {n > 1 ? (
                <>
                  {n}x de <b className="text-fg">{money(split.others)}</b>
                  {split.first !== split.others && <> (1ª de {money(split.first)})</>}
                  {" · "}
                </>
              ) : null}
              {method === "credito" ? (
                <>
                  1ª na fatura de <b className="text-fg capitalize">{monthLabel(firstMonth)}</b>
                  {n > 1 && <>, última em <span className="capitalize">{monthLabel(addMonths(firstMonth, n - 1))}</span></>}
                </>
              ) : (
                <>
                  {n > 1 ? "de" : "em"} <span className="capitalize">{monthLabel(firstMonth)}</span>
                  {n > 1 && <> a <span className="capitalize">{monthLabel(addMonths(firstMonth, n - 1))}</span></>}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {kind === "income" && !editing && (
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Repetir por quantos meses?</p>
            <p className="text-xs text-muted">Útil para salário fixo</p>
          </div>
          <Stepper value={repeat} onChange={setRepeat} max={24} />
        </div>
      )}

      <div className="space-y-2">
        <span className="label">Categoria</span>
        <div className="flex flex-wrap gap-2">
          {(kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => {
            const selected = (kind === "expense" ? expenseCategory : incomeCategory) === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={selected}
                onClick={() => (kind === "expense" ? setExpenseCategory(c.id) : setIncomeCategory(c.id))}
              >
                <c.icon className="size-4" />
                {c.id}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3 pt-1">
        {editing && (
          <button type="button" className="btn-ghost text-neg" onClick={remove} disabled={saving} aria-label="Excluir">
            <Trash2 className="size-5" />
          </button>
        )}
        <button className="btn-primary flex-1" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Salvar alterações" : kind === "expense" ? "Adicionar saída" : "Adicionar entrada"}
        </button>
      </div>
    </form>
  );
}

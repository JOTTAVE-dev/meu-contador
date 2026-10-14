"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { EXPENSE_CATEGORIES, METHODS } from "@/lib/constants";
import { db, useCards } from "@/lib/data";
import type { Bill, Method } from "@/lib/types";
import { MoneyInput, Stepper } from "./ui";

export function BillForm({ bill, onDone }: { bill?: Bill; onDone: () => void }) {
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill?.amount ?? 0);
  const [dueDay, setDueDay] = useState(bill?.due_day ?? 10);
  const [method, setMethod] = useState<Method>(bill?.method ?? "pix");
  const [cardId, setCardId] = useState(bill?.card_id ?? "");
  const [category, setCategory] = useState(bill?.category ?? "Contas");
  const [active, setActive] = useState(bill?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: cards } = useCards();
  const card = cards?.find((c) => c.id === cardId) ?? (method === "credito" ? cards?.[0] : undefined);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Dê um nome à conta.");
    if (method === "credito" && !card) return setError("Cadastre um cartão de crédito primeiro.");
    setSaving(true);
    try {
      await db.saveBill(
        {
          name: name.trim(),
          amount,
          due_day: dueDay,
          method,
          card_id: method === "credito" ? card!.id : null,
          category,
          active,
        },
        bill?.id,
      );
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!bill || !confirm(`Excluir a conta ${bill.name}? Os pagamentos já lançados continuam no histórico.`)) return;
    setSaving(true);
    try {
      await db.deleteBill(bill.id);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <label className="block space-y-1.5">
        <span className="label">Nome da conta</span>
        <input className="input" placeholder="Ex.: Aluguel, Internet, Netflix" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </label>

      <label className="block space-y-1.5">
        <span className="label">Valor de costume</span>
        <MoneyInput value={amount} onChange={setAmount} />
      </label>

      <div className="card flex items-center justify-between gap-3 p-4">
        <p className="text-sm font-medium">Vence todo dia</p>
        <Stepper value={dueDay} onChange={setDueDay} max={31} />
      </div>

      <div className="space-y-2">
        <span className="label">Como costuma pagar</span>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {METHODS.map((m) => (
            <button key={m.id} type="button" className="chip" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}>
              <m.icon className="size-4" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {method === "credito" && cards && cards.length > 0 && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {cards.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={card?.id === c.id} onClick={() => setCardId(c.id)}>
              <span className="size-3 rounded-full" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <span className="label">Categoria</span>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
              <c.icon className="size-4" />
              {c.id}
            </button>
          ))}
        </div>
      </div>

      <label className="card flex cursor-pointer items-center justify-between p-4">
        <span className="text-sm font-medium">Conta ativa</span>
        <input type="checkbox" className="size-5 accent-[var(--brand)]" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </label>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3">
        {bill && (
          <button type="button" className="btn-ghost text-neg" onClick={remove} disabled={saving} aria-label="Excluir">
            <Trash2 className="size-5" />
          </button>
        )}
        <button className="btn-primary flex-1" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {bill ? "Salvar" : "Adicionar conta"}
        </button>
      </div>
    </form>
  );
}

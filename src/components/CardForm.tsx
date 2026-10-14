"use client";

import { Check, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { CARD_COLORS } from "@/lib/constants";
import { db } from "@/lib/data";
import type { Card } from "@/lib/types";
import { MoneyInput, Stepper } from "./ui";

export function CardForm({ card, onDone }: { card?: Card; onDone: () => void }) {
  const [name, setName] = useState(card?.name ?? "");
  const [closing, setClosing] = useState(card?.closing_day ?? 1);
  const [due, setDue] = useState(card?.due_day ?? 10);
  const [limit, setLimit] = useState(card?.limit_amount ?? 0);
  const [color, setColor] = useState(card?.color ?? CARD_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Dê um nome ao cartão.");
    setSaving(true);
    try {
      await db.saveCard(
        { name: name.trim(), closing_day: closing, due_day: due, limit_amount: limit || null, color },
        card?.id,
      );
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!card || !confirm(`Excluir o cartão ${card.name}?`)) return;
    setSaving(true);
    try {
      await db.deleteCard(card.id);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div
        className="flex aspect-[1.7] flex-col justify-between rounded-2xl p-5 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, black))` }}
      >
        <span className="text-lg font-semibold">{name || "Meu cartão"}</span>
        <span className="text-sm opacity-80">
          Fecha dia {closing} · Vence dia {due}
        </span>
      </div>

      <label className="block space-y-1.5">
        <span className="label">Nome</span>
        <input className="input" placeholder="Ex.: Nubank, Inter" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>

      <div className="card divide-y divide-line">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Dia do fechamento</p>
            <p className="text-xs text-muted">Compras a partir deste dia vão para a próxima fatura</p>
          </div>
          <Stepper value={closing} onChange={setClosing} max={31} />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm font-medium">Dia do vencimento</p>
          <Stepper value={due} onChange={setDue} max={31} />
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="label">Limite (opcional)</span>
        <MoneyInput value={limit} onChange={setLimit} />
      </label>

      <div className="space-y-2">
        <span className="label">Cor</span>
        <div className="flex flex-wrap gap-3">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition active:scale-90"
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={color === c}
            >
              {color === c && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3">
        {card && (
          <button type="button" className="btn-ghost text-neg" onClick={remove} disabled={saving} aria-label="Excluir">
            <Trash2 className="size-5" />
          </button>
        )}
        <button className="btn-primary flex-1" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {card ? "Salvar" : "Adicionar cartão"}
        </button>
      </div>
    </form>
  );
}

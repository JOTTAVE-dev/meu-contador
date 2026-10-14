"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { addMonths, currentMonth, money, monthLabel } from "@/lib/format";
import { useMonth } from "./MonthProvider";

// ------------------------------------------------------------------ Sheet

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-[fade_.2s_ease-out] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="safe-bottom relative flex max-h-[92dvh] w-full max-w-lg animate-[slide-up_.25s_ease-out] flex-col rounded-t-3xl border border-line bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- MoneyInput

/** Digita-se só números: "1234" vira R$ 12,34 (como em app de banco). */
export function MoneyInput({
  value,
  onChange,
  big,
  autoFocus,
}: {
  value: number;
  onChange: (v: number) => void;
  big?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      className={big ? "w-full bg-transparent text-center text-4xl font-semibold tracking-tight outline-none" : "input"}
      inputMode="numeric"
      autoFocus={autoFocus}
      value={money(value)}
      aria-label="Valor"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
        onChange(Number(digits || "0") / 100);
      }}
      onFocus={(e) => {
        const el = e.target;
        requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
      }}
    />
  );
}

// ------------------------------------------------------------- Segmented

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid rounded-xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            value === o.id ? "bg-surface text-fg shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- Stepper

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 72,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v || min));
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-icon border border-line" onClick={() => onChange(clamp(value - 1))} aria-label="Menos">
        <Minus className="size-4" />
      </button>
      <div className="relative w-20">
        <input
          className="input py-2 pr-6 text-center font-semibold"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
      <button type="button" className="btn-icon border border-line" onClick={() => onChange(clamp(value + 1))} aria-label="Mais">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// --------------------------------------------------------- Page chrome

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-3">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {action}
      </div>
      <MonthSwitcher />
    </header>
  );
}

function MonthSwitcher() {
  const { month, setMonth } = useMonth();
  const isCurrent = month === currentMonth();
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-between px-2 pb-2">
      <button className="btn-icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
        <ChevronLeft className="size-5" />
      </button>
      <button
        className="flex flex-col items-center"
        onClick={() => setMonth(currentMonth())}
        title="Voltar para o mês atual"
      >
        <span className="font-medium capitalize">{monthLabel(month)}</span>
        {!isCurrent && <span className="text-[11px] text-brand">voltar para hoje</span>}
      </button>
      <button className="btn-icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</div>
      <p className="max-w-xs text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}

// --------------------------------------------------------------- BarList

/**
 * Lista de barras horizontais (uma série só, então uma cor e sem legenda).
 * Valores em texto ao lado do rótulo; barra fina com ponta arredondada.
 */
export function BarList({
  items,
}: {
  items: { key: string; label: string; value: number; icon?: ReactNode }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-3.5">
      {items.map((i) => {
        const pct = total ? Math.round((i.value / total) * 100) : 0;
        return (
          <li key={i.key} title={`${i.label}: ${money(i.value)} (${pct}%)`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {i.icon && <span className="text-muted">{i.icon}</span>}
                <span className="truncate">{i.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {money(i.value)} <span className="text-xs text-muted">{pct}%</span>
              </span>
            </div>
            <div className="h-2 rounded-r bg-track">
              <div className="h-2 rounded-r bg-bar" style={{ width: `${max ? (i.value / max) * 100 : 0}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

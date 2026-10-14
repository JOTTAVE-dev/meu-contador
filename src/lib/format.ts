/** Mês no formato "AAAA-MM". Datas no formato "AAAA-MM-DD" (sem fuso). */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function money(value: number) {
  return brl.format(value);
}

export function moneyCompact(value: number) {
  return Math.abs(value) >= 10000 ? brlCompact.format(value) : brl.format(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth() {
  return todayISO().slice(0, 7);
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** "2026-10" -> "2026-10-01" */
export function monthStart(month: string) {
  return `${month}-01`;
}

export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${pad(last)}`;
}

function monthDate(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** "outubro 2026" */
export function monthLabel(month: string) {
  const name = monthDate(month).toLocaleDateString("pt-BR", { month: "long" });
  return `${name} ${month.slice(0, 4)}`;
}

/** "out/26" */
export function monthShort(month: string) {
  const name = monthDate(month)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${name}/${month.slice(2, 4)}`;
}

/** "14/10" ou "14/10/2025" quando é de outro ano */
export function dateShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return y === todayISO().slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y}`;
}

export function dayInMonth(month: string, day: number) {
  const last = Number(monthEnd(month).slice(8));
  return `${month}-${pad(Math.min(day, last))}`;
}

/**
 * Mesma regra do trigger do banco: em qual fatura (mês de vencimento)
 * cai a 1ª parcela de uma compra no crédito. Usado só para pré-visualizar.
 */
export function firstInvoiceMonth(dateISO: string, closingDay: number, dueDay: number) {
  let month = dateISO.slice(0, 7);
  if (Number(dateISO.slice(8, 10)) >= closingDay) month = addMonths(month, 1);
  if (dueDay <= closingDay) month = addMonths(month, 1);
  return month;
}

/** Divide em centavos, sobra vai pra 1ª parcela (igual ao banco). */
export function splitInstallments(total: number, n: number) {
  const cents = Math.round(total * 100);
  const part = Math.floor(cents / n);
  return { first: (part + (cents - part * n)) / 100, others: part / 100 };
}

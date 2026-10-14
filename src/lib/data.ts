"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/components/AuthProvider";
import { addMonths, monthEnd, monthStart } from "./format";
import { supabase } from "./supabase";
import type { Bill, Card, Expense, Income, Installment } from "./types";

const EXPENSE_FIELDS =
  "id, description, place, amount, date, method, card_id, installments, category, bill_id, bill_month";

async function run<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}

/** Revalida todas as consultas depois de qualquer alteração. */
export function refreshAll() {
  return mutate(() => true);
}

// ---------------------------------------------------------------- leituras

export function useCards() {
  const { userId } = useAuth();
  return useSWR(["cards", userId], () =>
    run<Card[]>(supabase().from("cards").select("*").order("created_at")),
  );
}

export function useBills() {
  const { userId } = useAuth();
  return useSWR(["bills", userId], () =>
    run<Bill[]>(supabase().from("bills").select("*").order("due_day")),
  );
}

export function useIncomes(month: string) {
  const { userId } = useAuth();
  return useSWR(["incomes", userId, month], () =>
    run<Income[]>(
      supabase()
        .from("incomes")
        .select("*")
        .gte("date", monthStart(month))
        .lte("date", monthEnd(month))
        .order("date", { ascending: false }),
    ),
  );
}

/** Parcelas que pesam no mês (débito/pix do mês + faturas que vencem no mês). */
export function useInstallments(month: string) {
  const { userId } = useAuth();
  return useSWR(["installments", userId, month], () =>
    run<Installment[]>(
      supabase()
        .from("installments")
        .select(`*, expense:expenses!inner(${EXPENSE_FIELDS})`)
        .eq("ref_month", monthStart(month)),
    ).then(sortByPurchaseDate),
  );
}

/** Parcelas do crédito de um intervalo de meses (para as faturas futuras). */
export function useCreditInstallments(fromMonth: string, months: number) {
  const { userId } = useAuth();
  return useSWR(["credit", userId, fromMonth, months], () =>
    run<Installment[]>(
      supabase()
        .from("installments")
        .select(`*, expense:expenses!inner(${EXPENSE_FIELDS})`)
        .eq("method", "credito")
        .gte("ref_month", monthStart(fromMonth))
        .lte("ref_month", monthStart(addMonths(fromMonth, months - 1))),
    ).then(sortByPurchaseDate),
  );
}

/** Contas fixas já pagas no mês */
export function usePaidBills(month: string) {
  const { userId } = useAuth();
  return useSWR(["paid-bills", userId, month], () =>
    run<Pick<Expense, "id" | "bill_id" | "amount">[]>(
      supabase()
        .from("expenses")
        .select("id, bill_id, amount")
        .eq("bill_month", monthStart(month))
        .not("bill_id", "is", null),
    ),
  );
}

function sortByPurchaseDate(list: Installment[]) {
  return [...list].sort(
    (a, b) =>
      b.expense.date.localeCompare(a.expense.date) || a.expense.description.localeCompare(b.expense.description),
  );
}

// ---------------------------------------------------------------- escritas

type Row<T> = Omit<T, "id">;

async function write(query: PromiseLike<{ error: { message: string; code?: string } | null }>) {
  const { error } = await query;
  if (error) {
    if (error.code === "23503") {
      throw new Error("Não dá para excluir: existem lançamentos usando este item.");
    }
    if (error.code === "23505") throw new Error("Essa conta já foi paga neste mês.");
    throw new Error(error.message);
  }
  await refreshAll();
}

export const db = {
  saveExpense: (row: Row<Expense>, id?: string) =>
    write(
      id
        ? supabase().from("expenses").update(row).eq("id", id)
        : supabase().from("expenses").insert(row),
    ),
  deleteExpense: (id: string) => write(supabase().from("expenses").delete().eq("id", id)),

  saveIncome: (row: Row<Income>, id?: string) =>
    write(
      id ? supabase().from("incomes").update(row).eq("id", id) : supabase().from("incomes").insert(row),
    ),
  /** Cria a mesma entrada repetida por vários meses (ex.: salário). */
  insertIncomes: (rows: Row<Income>[]) => write(supabase().from("incomes").insert(rows)),
  deleteIncome: (id: string) => write(supabase().from("incomes").delete().eq("id", id)),

  saveCard: (row: Row<Card>, id?: string) =>
    write(id ? supabase().from("cards").update(row).eq("id", id) : supabase().from("cards").insert(row)),
  deleteCard: (id: string) => write(supabase().from("cards").delete().eq("id", id)),

  saveBill: (row: Row<Bill>, id?: string) =>
    write(id ? supabase().from("bills").update(row).eq("id", id) : supabase().from("bills").insert(row)),
  deleteBill: (id: string) => write(supabase().from("bills").delete().eq("id", id)),
};

export async function fetchExpense(id: string) {
  return run<Expense>(supabase().from("expenses").select(EXPENSE_FIELDS).eq("id", id).single());
}

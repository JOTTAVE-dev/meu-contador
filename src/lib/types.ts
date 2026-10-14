export type Method = "pix" | "debito" | "credito" | "dinheiro" | "boleto";

export type Card = {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
  color: string;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  method: Method;
  card_id: string | null;
  category: string;
  active: boolean;
};

export type Income = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
};

export type Expense = {
  id: string;
  description: string;
  place: string | null;
  amount: number;
  date: string;
  method: Method;
  card_id: string | null;
  installments: number;
  category: string;
  bill_id: string | null;
  bill_month: string | null;
};

export type Installment = {
  id: string;
  expense_id: string;
  number: number;
  total: number;
  amount: number;
  ref_month: string;
  method: Method;
  card_id: string | null;
  expense: Expense;
};

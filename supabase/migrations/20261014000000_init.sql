-- =====================================================================
-- Financeiro JV - schema inicial
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cartões de crédito
-- ---------------------------------------------------------------------
create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  closing_day   int  not null check (closing_day between 1 and 31),
  due_day       int  not null check (due_day between 1 and 31),
  limit_amount  numeric(12, 2),
  color         text not null default '#8b5cf6',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Contas fixas (aluguel, luz, internet, assinaturas...)
-- ---------------------------------------------------------------------
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  due_day     int  not null check (due_day between 1 and 31),
  method      text not null default 'pix'
              check (method in ('pix', 'debito', 'credito', 'dinheiro', 'boleto')),
  card_id     uuid references public.cards (id) on delete set null,
  category    text not null default 'Contas',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Entradas (salário, freelas, etc.)
-- ---------------------------------------------------------------------
create table if not exists public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description  text not null,
  amount       numeric(12, 2) not null check (amount > 0),
  date         date not null default current_date,
  category     text not null default 'Salário',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Saídas (cada compra / pagamento). "amount" é sempre o valor cheio.
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description   text not null,                 -- o que comprou
  place         text,                          -- onde gastou
  amount        numeric(12, 2) not null check (amount > 0),
  date          date not null default current_date,
  method        text not null
                check (method in ('pix', 'debito', 'credito', 'dinheiro', 'boleto')),
  -- não deixa excluir um cartão que ainda tem compras lançadas
  card_id       uuid references public.cards (id) on delete restrict,
  installments  int  not null default 1 check (installments between 1 and 72),
  category      text not null default 'Outros',
  bill_id       uuid references public.bills (id) on delete set null,
  bill_month    date,                          -- mês da conta fixa que foi paga
  created_at    timestamptz not null default now(),
  constraint credit_needs_card check (method <> 'credito' or card_id is not null)
);

-- Uma conta fixa só pode ser paga uma vez por mês
create unique index if not exists expenses_bill_month_uniq
  on public.expenses (bill_id, bill_month)
  where bill_id is not null;

-- ---------------------------------------------------------------------
-- Parcelas: geradas automaticamente a partir de "expenses".
-- ref_month = primeiro dia do mês em que a parcela pesa no bolso
--   * crédito  -> mês de vencimento da fatura
--   * demais   -> mês da compra (+1 mês por parcela, ex.: carnê/boleto)
-- ---------------------------------------------------------------------
create table if not exists public.installments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  number      int  not null,
  total       int  not null,
  amount      numeric(12, 2) not null,
  ref_month   date not null,
  method      text not null,
  card_id     uuid references public.cards (id) on delete set null,
  unique (expense_id, number)
);

create index if not exists installments_user_month_idx on public.installments (user_id, ref_month);
create index if not exists incomes_user_date_idx       on public.incomes (user_id, date);
create index if not exists expenses_user_date_idx      on public.expenses (user_id, date);

-- ---------------------------------------------------------------------
-- Geração das parcelas
-- ---------------------------------------------------------------------
create or replace function public.generate_installments()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  n           int    := greatest(coalesce(new.installments, 1), 1);
  cents       bigint := round(new.amount * 100);
  part        bigint := cents / n;
  remainder   bigint := cents - part * n;
  base_month  date   := date_trunc('month', new.date)::date;
  v_closing   int;
  v_due       int;
begin
  delete from installments where expense_id = new.id;

  if new.method = 'credito' and new.card_id is not null then
    select closing_day, due_day into v_closing, v_due
      from cards where id = new.card_id;

    -- Compra no dia do fechamento ou depois cai na fatura seguinte
    if extract(day from new.date) >= v_closing then
      base_month := (base_month + interval '1 month')::date;
    end if;

    -- Se o vencimento é antes (ou no mesmo dia) do fechamento,
    -- a fatura vence no mês seguinte ao fechamento
    if v_due <= v_closing then
      base_month := (base_month + interval '1 month')::date;
    end if;
  end if;

  for i in 1..n loop
    insert into installments (user_id, expense_id, number, total, amount, ref_month, method, card_id)
    values (
      new.user_id,
      new.id,
      i,
      n,
      -- centavos que sobram da divisão ficam na 1ª parcela
      (part + case when i = 1 then remainder else 0 end) / 100.0,
      (base_month + make_interval(months => i - 1))::date,
      new.method,
      new.card_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists expenses_generate_installments on public.expenses;
create trigger expenses_generate_installments
  after insert or update of amount, date, method, card_id, installments
  on public.expenses
  for each row execute function public.generate_installments();

-- Se mudar o fechamento/vencimento do cartão, recalcula as parcelas dele
create or replace function public.regenerate_card_installments()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update expenses set card_id = card_id where card_id = new.id;
  return new;
end;
$$;

drop trigger if exists cards_regenerate_installments on public.cards;
create trigger cards_regenerate_installments
  after update of closing_day, due_day
  on public.cards
  for each row execute function public.regenerate_card_installments();

-- ---------------------------------------------------------------------
-- Row Level Security: cada usuário só enxerga os próprios dados
-- ---------------------------------------------------------------------
alter table public.cards        enable row level security;
alter table public.bills        enable row level security;
alter table public.incomes      enable row level security;
alter table public.expenses     enable row level security;
alter table public.installments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cards', 'bills', 'incomes', 'expenses', 'installments'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

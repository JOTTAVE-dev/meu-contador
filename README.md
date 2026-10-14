# Financeiro JV

App pessoal para controlar os gastos do mês: salário e outras entradas, contas fixas,
compras no Pix, débito, dinheiro, boleto e **cartão de crédito parcelado** (cada parcela
cai automaticamente na fatura certa). Funciona como app no celular (PWA).

**Stack:** Next.js 16 + Tailwind 4 · Supabase (banco + login) · Vercel (deploy)

## Telas

| Tela | O que faz |
|---|---|
| **Início** | Saldo do mês, entradas × saídas, contas a pagar, gastos por categoria e por forma de pagamento |
| **Extrato** | Todos os lançamentos do mês, com busca e filtro (Pix, Débito, Crédito...) |
| **+** | Novo lançamento: valor, o que foi, onde, dia, forma de pagamento, cartão, parcelas e categoria |
| **Cartões** | Fatura do mês, limite usado, gráfico das próximas faturas e compras de cada fatura (ex.: 3/10) |
| **Contas** | Contas fixas (aluguel, luz, internet...) com status pago/pendente/atrasado em cada mês |

### Como as parcelas funcionam

No crédito você informa o **valor cheio** e o **número de parcelas**. O banco gera as parcelas
sozinho (trigger em `supabase/migrations`) usando o **dia de fechamento** e o **dia de vencimento**
do cartão:

- compra **antes** do fechamento → entra na fatura que fecha naquele mês
- compra **no dia do fechamento ou depois** → vai para a fatura seguinte
- centavos que sobram da divisão ficam na 1ª parcela (R$ 100 em 3x = 33,34 + 33,33 + 33,33)

As faturas aparecem no mês em que **vencem**, que é quando o dinheiro sai da sua conta.
Boleto também pode ser parcelado (carnê): uma parcela por mês a partir do mês da compra.

Para lançar uma compra parcelada que você fez antes de usar o app, coloque a **data original
da compra**: as parcelas já pagas ficam nos meses anteriores e as que faltam aparecem nas próximas faturas.

---

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano grátis basta).
2. Vá em **SQL Editor → New query**, cole todo o conteúdo de
   [`supabase/migrations/20261014000000_init.sql`](supabase/migrations/20261014000000_init.sql) e clique em **Run**.
3. Em **Project Settings → API** (ou **Connect**), copie a **Project URL** e a chave **anon / publishable**.
4. (Opcional) Em **Authentication → Sign In / Providers → Email**, desligue *Confirm email* se não
   quiser confirmar o e-mail ao criar a conta.
5. Depois do deploy, em **Authentication → URL Configuration**, coloque a URL da Vercel em **Site URL**
   (é para onde o link de confirmação de e-mail leva).

> A chave anon pode ficar no navegador: cada tabela tem Row Level Security, então cada usuário
> só lê e grava os próprios dados.

## 2. Rodar no computador

```bash
cp .env.example .env.local   # e preencha com a URL e a chave do passo 1
npm install
npm run dev                  # abre em http://localhost:3000
```

## 3. Deploy na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Na [Vercel](https://vercel.com/new), importe o repositório (ela detecta Next.js sozinha).
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Clique em **Deploy**.

## 4. Instalar no celular (PWA)

Abra a URL da Vercel no celular:

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** botão Compartilhar → **Adicionar à Tela de Início**.

O app abre em tela cheia, com ícone próprio, como um app nativo.

---

## Estrutura

```
supabase/migrations/   schema, trigger das parcelas e RLS
src/app/               rotas (cada page.tsx só aponta para uma tela)
src/screens/           telas: Início, Extrato, Cartões, Contas
src/components/        login, formulários, painel deslizante, navegação
src/lib/               cliente Supabase, consultas (SWR), formatação de datas e dinheiro
public/sw.js           service worker (abre rápido e funciona sem internet para a interface)
scripts/gen-icons.mjs  gera os ícones do PWA (`node scripts/gen-icons.mjs`)
```

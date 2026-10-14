"use client";

import type { Session } from "@supabase/supabase-js";
import { Loader2, Wallet } from "lucide-react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { mutate } from "swr";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthState = { userId: string; email: string; signOut: () => Promise<void> };

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

/** Só renderiza o app quando há usuário logado; senão mostra o login. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = supabase();
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <p className="max-w-sm text-center text-sm text-neg">
          Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja o README).
        </p>
      </Centered>
    );
  }

  if (session === undefined) {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-muted" aria-label="Carregando" />
      </Centered>
    );
  }

  if (!session) return <LoginScreen />;

  const value: AuthState = {
    userId: session.user.id,
    email: session.user.email ?? "",
    signOut: async () => {
      await supabase().auth.signOut();
      // limpa o cache de dados do usuário anterior
      await mutate(() => true, undefined, { revalidate: false });
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-6">{children}</div>;
}

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).",
  "User already registered": "Este e-mail já tem conta. Faça login.",
};

function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const auth = supabase().auth;
    const { data, error } =
      mode === "login"
        ? await auth.signInWithPassword({ email, password })
        : await auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: ERRORS[error.message] ?? error.message });
    } else if (mode === "signup" && !data.session) {
      setMessage({ type: "info", text: "Conta criada! Confirme pelo link enviado ao seu e-mail." });
      setMode("login");
    }
  }

  return (
    <Centered>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <Wallet className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro JV</h1>
          <p className="text-sm text-muted">Controle seus gastos do mês</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <label className="block space-y-1.5">
            <span className="label">E-mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Senha</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {message && (
            <p className={`text-sm ${message.type === "error" ? "text-neg" : "text-pos"}`}>
              {message.text}
            </p>
          )}

          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted hover:text-fg"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
        >
          {mode === "login" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </Centered>
  );
}

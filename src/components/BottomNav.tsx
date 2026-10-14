"use client";

import { CreditCard, House, List, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEditor } from "./Editor";

const LINKS = [
  { href: "/", label: "Início", icon: House },
  { href: "/lancamentos", label: "Extrato", icon: List },
  null, // botão central de adicionar
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/contas", label: "Contas", icon: Receipt },
];

export function BottomNav() {
  const pathname = usePathname();
  const { newTransaction } = useEditor();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-center">
        {LINKS.map((link) =>
          link ? (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium transition ${
                pathname === link.href ? "text-brand" : "text-muted hover:text-fg"
              }`}
            >
              <link.icon className="size-5" />
              {link.label}
            </Link>
          ) : (
            <div key="add" className="flex justify-center">
              <button
                onClick={newTransaction}
                className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/40 transition active:scale-90"
                aria-label="Novo lançamento"
              >
                <Plus className="size-7" />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}

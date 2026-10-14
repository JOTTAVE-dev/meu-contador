import {
  Banknote,
  Barcode,
  Briefcase,
  Car,
  CreditCard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PartyPopper,
  PawPrint,
  Plane,
  QrCode,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";
import type { Method } from "./types";

export const METHODS: { id: Method; label: string; icon: LucideIcon }[] = [
  { id: "pix", label: "Pix", icon: QrCode },
  { id: "debito", label: "Débito", icon: Landmark },
  { id: "credito", label: "Crédito", icon: CreditCard },
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "boleto", label: "Boleto", icon: Barcode },
];

export const methodLabel = (m: Method) => METHODS.find((x) => x.id === m)?.label ?? m;

/** Formas de pagamento que aceitam parcelamento */
export const INSTALLABLE: Method[] = ["credito", "boleto"];

export const EXPENSE_CATEGORIES: { id: string; icon: LucideIcon }[] = [
  { id: "Alimentação", icon: UtensilsCrossed },
  { id: "Mercado", icon: ShoppingCart },
  { id: "Transporte", icon: Car },
  { id: "Moradia", icon: House },
  { id: "Contas", icon: Receipt },
  { id: "Saúde", icon: HeartPulse },
  { id: "Educação", icon: GraduationCap },
  { id: "Lazer", icon: PartyPopper },
  { id: "Compras", icon: ShoppingBag },
  { id: "Assinaturas", icon: Repeat },
  { id: "Pets", icon: PawPrint },
  { id: "Viagem", icon: Plane },
  { id: "Outros", icon: Ellipsis },
];

export const INCOME_CATEGORIES: { id: string; icon: LucideIcon }[] = [
  { id: "Salário", icon: Briefcase },
  { id: "Freelance", icon: Laptop },
  { id: "Investimentos", icon: TrendingUp },
  { id: "Presente", icon: Gift },
  { id: "Outros", icon: Ellipsis },
];

export function CategoryIcon({
  category,
  income = false,
  className,
}: {
  category: string;
  income?: boolean;
  className?: string;
}) {
  const list = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return createElement(list.find((c) => c.id === category)?.icon ?? Ellipsis, { className });
}

export const CARD_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#111827",
];

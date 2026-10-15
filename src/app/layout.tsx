import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { EditorProvider } from "@/components/Editor";
import { MonthProvider } from "@/components/MonthProvider";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// O app inteiro roda no navegador atrás do login (AuthProvider), então as
// páginas não são renderizadas no servidor: desliga a validação de navegação
// instantânea, que só faz sentido para conteúdo pré-renderizado.
export const instant = false;

export const metadata: Metadata = {
  title: "Financeiro JV",
  description: "Controle de gastos mensais: entradas, contas, Pix, débito e cartão de crédito parcelado.",
  appleWebApp: { capable: true, title: "Financeiro", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // comportamento de app: sem zoom ao tocar nos campos nem de pinça
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <PwaRegister />
        <AuthProvider>
          <MonthProvider>
            <EditorProvider>
              <div className="pb-28">{children}</div>
              <BottomNav />
            </EditorProvider>
          </MonthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

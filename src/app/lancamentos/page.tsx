import { ExtratoScreen } from "@/screens/ExtratoScreen";

// A tela roda só no navegador (depois do login), então não há o que validar
// de navegação instantânea no servidor.
export const instant = false;

export default function Page() {
  return <ExtratoScreen />;
}

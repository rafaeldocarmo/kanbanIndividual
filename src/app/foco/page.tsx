import { BoardShell } from "@/components/board/board-shell";
import { getBoardItems } from "@/db/queries";
import { isoDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Foco do dia",
  description: "Mural de atividades para conferir diariamente.",
};

export default async function FocoPage() {
  const data = await getBoardItems();
  // "Hoje" no fuso do usuário (Brasil), calculado no servidor para render estável.
  const today = isoDay();

  return <BoardShell data={data} today={today} />;
}

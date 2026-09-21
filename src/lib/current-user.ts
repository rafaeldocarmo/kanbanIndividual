import { cookies } from "next/headers";
import { getAssignees } from "@/db/queries";
import { ME_COOKIE } from "@/lib/team";

/**
 * Quem está usando o app, lido do cookie "Você é". Sem login: é só uma
 * assinatura para `atualizadoPor` e autor de comentários. Ids que não são
 * mais da equipe viram null.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const id = (await cookies()).get(ME_COOKIE)?.value;
  if (!id) return null;
  const team = await getAssignees();
  return team.some((a) => a.id === id) ? id : null;
}

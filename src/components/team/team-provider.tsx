"use client";

import * as React from "react";
import type { Assignee } from "@/db/schema";
import { ME_COOKIE, avatarHue } from "@/lib/team";

export type TeamMember = Assignee & { hue: number };

type TeamCtx = {
  /** Na ordem de exibição (alfabética, "Outros" por último). */
  team: TeamMember[];
  me: TeamMember | null;
  setMe: (id: string) => void;
  member: (id: string | null | undefined) => TeamMember | null;
};

const TeamContext = React.createContext<TeamCtx | null>(null);

export function useTeam() {
  const ctx = React.useContext(TeamContext);
  if (!ctx) throw new Error("TeamProvider required");
  return ctx;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export function TeamProvider({
  team,
  initialMeId,
  children,
}: {
  team: Assignee[];
  initialMeId: string | null;
  children: React.ReactNode;
}) {
  const [meId, setMeId] = React.useState(initialMeId);

  // O matiz vem do banco; a posição na lista é só reserva (equipe nova).
  const members = React.useMemo(
    () => team.map((a, i) => ({ ...a, hue: a.hue ?? avatarHue(i) })),
    [team],
  );
  const byId = React.useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  // Cookie lido pelo servidor (SSR do filtro "Minhas" e assinatura das ações).
  const setMe = React.useCallback((id: string) => {
    setMeId(id);
    document.cookie = `${ME_COOKIE}=${id}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }, []);

  const value = React.useMemo<TeamCtx>(
    () => ({
      team: members,
      me: (meId && byId.get(meId)) || null,
      setMe,
      member: (id) => (id ? (byId.get(id) ?? null) : null),
    }),
    [members, byId, meId, setMe],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

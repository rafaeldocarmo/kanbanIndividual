import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { TeamProvider } from "@/components/team/team-provider";
import { ensureDefaults, getAssignees } from "@/db/queries";
import { getCurrentUserId } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Kanban da Equipe",
  description: "Gerenciamento simples e rápido de atividades da equipe.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDefaults();
  const [team, meId] = await Promise.all([getAssignees(), getCurrentUserId()]);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          <TeamProvider team={team} initialMeId={meId}>
            <div className="bg-grid flex h-svh flex-col overflow-hidden">
              <Header />
              <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </TeamProvider>
        </Providers>
      </body>
    </html>
  );
}

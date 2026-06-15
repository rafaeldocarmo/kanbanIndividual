import { NotesShell, type NotesBootstrap } from "@/components/notes/notes-shell";
import { getLinks, getNotes, getReminders } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notas & Lembretes",
  description: "Anotações, lembretes e links úteis.",
};

export default async function NotasPage() {
  const [notes, reminders, links] = await Promise.all([
    getNotes(),
    getReminders(),
    getLinks(),
  ]);

  const data: NotesBootstrap = { notes, reminders, links };

  return <NotesShell data={data} />;
}

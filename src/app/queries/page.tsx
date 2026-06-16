import { QueriesShell } from "@/components/queries/queries-shell";
import { getSavedQueries } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Queries",
  description: "Salve e copie queries de banco de dados.",
};

export default async function QueriesPage() {
  const data = await getSavedQueries();
  return <QueriesShell data={data} />;
}

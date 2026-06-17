import { db } from "./client";
import {
  activities,
  activityStatusUpdates,
  assignees,
  journeys,
  links,
  notes,
  reminders,
  savedQueries,
  stages,
} from "./schema";
import { asc, eq, sql, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/**
 * Tags do Data Cache. As leituras abaixo ficam em cache (sem ida ao banco a
 * cada navegação) e só são invalidadas quando uma server action chama
 * `revalidateTag(...)` com a tag correspondente. Ver `src/app/actions/*`.
 */
export const CACHE_TAGS = {
  meta: "meta",
  activities: "activities",
  notes: "notes",
  reminders: "reminders",
  links: "links",
  queries: "queries",
} as const;

export type ActivityView = Awaited<ReturnType<typeof getActivities>>[number];

export const getStages = unstable_cache(
  async () => db.select().from(stages).orderBy(asc(stages.position)),
  ["stages"],
  { tags: [CACHE_TAGS.meta] },
);

export const getJourneys = unstable_cache(
  async () => db.select().from(journeys).orderBy(asc(journeys.name)),
  ["journeys"],
  { tags: [CACHE_TAGS.meta] },
);

export const getAssignees = unstable_cache(
  async () => db.select().from(assignees).orderBy(asc(assignees.name)),
  ["assignees"],
  { tags: [CACHE_TAGS.meta] },
);

export const getActivities = unstable_cache(_getActivities, ["activities"], {
  // Depende de atividades + metadados (stage/journey/assignee fazem join).
  tags: [CACHE_TAGS.activities, CACHE_TAGS.meta],
});

async function _getActivities() {
  const [rows, statusRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        name: activities.name,
        dueDate: activities.dueDate,
        priority: activities.priority,
        position: activities.position,
        stageId: activities.stageId,
        journeyId: activities.journeyId,
        assigneeId: activities.assigneeId,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
        stageName: stages.name,
        stageColor: stages.color,
        journeyName: journeys.name,
        journeyColor: journeys.color,
        assigneeName: assignees.name,
        assigneeInitials: assignees.initials,
        assigneeColor: assignees.color,
      })
      .from(activities)
      .leftJoin(stages, eq(stages.id, activities.stageId))
      .leftJoin(journeys, eq(journeys.id, activities.journeyId))
      .leftJoin(assignees, eq(assignees.id, activities.assigneeId))
      .orderBy(asc(activities.position)),
    db
      .select()
      .from(activityStatusUpdates)
      .orderBy(desc(activityStatusUpdates.createdAt)),
  ]);

  const statusByActivity = new Map<
    string,
    { id: string; content: string; createdAt: Date }[]
  >();
  for (const s of statusRows) {
    const arr = statusByActivity.get(s.activityId);
    const entry = { id: s.id, content: s.content, createdAt: s.createdAt };
    if (arr) arr.push(entry);
    else statusByActivity.set(s.activityId, [entry]);
  }

  return rows.map((r) => {
    const history = statusByActivity.get(r.id) ?? [];
    return {
      ...r,
      position: String(r.position),
      statusUpdates: history,
      lastStatus: history[0]?.content ?? null,
    };
  });
}

let defaultsPromise: Promise<void> | null = null;

const DEFAULT_STAGES: { name: string; color: string; position: number }[] = [
  { name: "Backlog", color: "#94a3b8", position: 1000 },
  { name: "Em Andamento", color: "#3b82f6", position: 2000 },
  { name: "Pendente Terceiros", color: "#f97316", position: 2500 },
  { name: "Concluído", color: "#10b981", position: 3000 },
];

export function ensureDefaults(): Promise<void> {
  if (defaultsPromise) return defaultsPromise;
  defaultsPromise = (async () => {
    const [existingStages, hasJourneys, hasAssignees] = await Promise.all([
      db.select({ name: stages.name }).from(stages),
      db.select({ id: journeys.id }).from(journeys).limit(1),
      db.select({ id: assignees.id }).from(assignees).limit(1),
    ]);

    const inserts: Promise<unknown>[] = [];

    const existingStageNames = new Set(existingStages.map((s) => s.name));
    const missingStages = DEFAULT_STAGES.filter(
      (s) => !existingStageNames.has(s.name),
    );
    if (missingStages.length > 0) {
      inserts.push(db.insert(stages).values(missingStages));
    }

    if (hasJourneys.length === 0) {
      inserts.push(
        db.insert(journeys).values([
          { name: "Cross-Sell", color: "#a78bfa" },
          { name: "NBA", color: "#34d399" },
          { name: "Base", color: "#60a5fa" },
        ]),
      );
    }
    if (hasAssignees.length === 0) {
      inserts.push(
        db.insert(assignees).values([
          { name: "Eu", initials: "EU", color: "#0ea5e9" },
          { name: "Falbi", initials: "FA", color: "#f97316" },
          { name: "Chimi", initials: "CH", color: "#10b981" },
          { name: "N2", initials: "N2", color: "#a855f7" },
        ]),
      );
    }
    if (inserts.length > 0) await Promise.all(inserts);
  })();

  defaultsPromise.catch(() => {
    defaultsPromise = null;
  });

  return defaultsPromise;
}

export const getNotes = unstable_cache(
  async () => db.select().from(notes).orderBy(desc(notes.createdAt)),
  ["notes"],
  { tags: [CACHE_TAGS.notes] },
);

export const getReminders = unstable_cache(
  async () =>
    // Pendentes antes de concluídos; dentro de cada grupo, por data (nulls por último).
    db
      .select()
      .from(reminders)
      .orderBy(asc(reminders.done), asc(reminders.dueDate), asc(reminders.createdAt)),
  ["reminders"],
  { tags: [CACHE_TAGS.reminders] },
);

export const getLinks = unstable_cache(
  async () => db.select().from(links).orderBy(desc(links.createdAt)),
  ["links"],
  { tags: [CACHE_TAGS.links] },
);

export const getSavedQueries = unstable_cache(
  async () => db.select().from(savedQueries).orderBy(asc(savedQueries.position)),
  ["saved-queries"],
  { tags: [CACHE_TAGS.queries] },
);

// Novas queries entram no topo (menor posição). Reordenação usa fractional indexing.
export async function topPositionForQuery(): Promise<number> {
  const result = await db
    .select({ min: sql<string | null>`min(${savedQueries.position})` })
    .from(savedQueries);
  const min = result[0]?.min ? Number(result[0].min) : null;
  return min === null ? 1000 : min - 1000;
}

export async function nextPositionForStage(stageId: string): Promise<number> {
  const result = await db
    .select({ max: sql<string | null>`max(${activities.position})` })
    .from(activities)
    .where(eq(activities.stageId, stageId));
  const max = result[0]?.max ? Number(result[0].max) : 0;
  return max + 1000;
}

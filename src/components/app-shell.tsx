"use client";

import * as React from "react";
import { toast } from "sonner";
import { Toolbar } from "@/components/toolbar";
import dynamic from "next/dynamic";
import { ListView } from "@/components/list-view";
import { BoardView } from "@/components/board-view";
import { QuickAdd } from "@/components/quick-add";
import { TeamLoad } from "@/components/team/team-load";
import { useTeam } from "@/components/team/team-provider";
import { completionAfter, isMine } from "@/lib/team";

const ActivityDialog = dynamic(
  () =>
    import("@/components/activity/activity-dialog").then((m) => ({
      default: m.ActivityDialog,
    })),
  { ssr: false },
);
const ActivityStatusDialog = dynamic(
  () =>
    import("@/components/activity/activity-status-dialog").then((m) => ({
      default: m.ActivityStatusDialog,
    })),
  { ssr: false },
);
import type {
  ActivityView,
  BootstrapData,
  CommentEntry,
  GroupBy,
  Lanes,
  Scope,
  ViewMode,
} from "@/lib/types";
import { useQueryState, parseAsStringEnum } from "nuqs";

const GROUPS: GroupBy[] = ["status", "journey", "assignee"];
const VIEWS: ViewMode[] = ["list", "board"];
const SCOPES: Scope[] = ["team", "mine"];
const LANES: Lanes[] = ["none", "person"];

export type Mutation =
  | { type: "create"; activity: ActivityView }
  | { type: "update"; activity: ActivityView }
  | { type: "delete"; id: string }
  | {
      type: "move";
      id: string;
      stageId?: string;
      stageName?: string | null;
      stageColor?: string | null;
      journeyId?: string | null;
      journeyName?: string | null;
      journeyColor?: string | null;
      assigneeIds?: string[];
      position?: string;
    }
  | {
      type: "addStatus";
      activityId: string;
      status: { id: string; content: string; createdAt: Date };
    }
  | { type: "removeStatus"; activityId: string; statusId: string }
  /** Troca campos simples (responsável, bloqueio…) sem mexer na posição. */
  | { type: "patch"; id: string; patch: Partial<ActivityView> }
  | { type: "addComment"; activityId: string; comment: CommentEntry }
  | { type: "removeComment"; activityId: string; commentId: string };

/** Mutação + quem está usando o app, para carimbar "atualizado agora por". */
type Stamped = Mutation & { by: string | null };

function reducer(state: ActivityView[], action: Stamped): ActivityView[] {
  const touch = (a: ActivityView): ActivityView => ({
    ...a,
    updatedAt: new Date(),
    updatedById: action.by,
  });
  switch (action.type) {
    case "create":
      return [action.activity, ...state];
    case "update":
      return state.map((a) =>
        a.id === action.activity.id
          ? touch({
              ...action.activity,
              completedAt: completionAfter(a, action.activity),
            })
          : a,
      );
    case "delete":
      return state.filter((a) => a.id !== action.id);
    case "move": {
      const next = state.map((a) => {
        if (a.id !== action.id) return a;
        // Reordenar na mesma coluna não conta como atualização (igual ao servidor).
        const changed =
          (action.stageId !== undefined && action.stageId !== a.stageId) ||
          (action.journeyId !== undefined && action.journeyId !== a.journeyId) ||
          (action.assigneeIds !== undefined &&
            action.assigneeIds.join() !== a.assigneeIds.join());
        const out: ActivityView = changed ? touch(a) : { ...a };
        if (action.stageId !== undefined) {
          out.stageId = action.stageId;
          out.stageName = action.stageName ?? null;
          out.stageColor = action.stageColor ?? null;
          out.completedAt = completionAfter(a, out);
        }
        if (action.journeyId !== undefined) {
          out.journeyId = action.journeyId;
          out.journeyName = action.journeyName ?? null;
          out.journeyColor = action.journeyColor ?? null;
        }
        if (action.assigneeIds !== undefined) out.assigneeIds = action.assigneeIds;
        if (action.position !== undefined) out.position = action.position;
        return out;
      });
      return next.sort(
        (a, b) => Number(a.position) - Number(b.position),
      );
    }
    case "addStatus":
      return state.map((a) =>
        a.id === action.activityId
          ? {
              ...touch(a),
              statusUpdates: [action.status, ...a.statusUpdates],
              lastStatus: action.status.content,
            }
          : a,
      );
    case "removeStatus":
      return state.map((a) => {
        if (a.id !== action.activityId) return a;
        const next = a.statusUpdates.filter((s) => s.id !== action.statusId);
        return {
          ...a,
          statusUpdates: next,
          lastStatus: next[0]?.content ?? null,
        };
      });
    case "patch":
      return state.map((a) =>
        a.id === action.id ? { ...touch(a), ...action.patch } : a,
      );
    case "addComment":
      return state.map((a) =>
        a.id === action.activityId
          ? { ...touch(a), comments: [...a.comments, action.comment] }
          : a,
      );
    case "removeComment":
      return state.map((a) =>
        a.id === action.activityId
          ? {
              ...a,
              comments: a.comments.filter((c) => c.id !== action.commentId),
            }
          : a,
      );
  }
}

type ActivitiesCtx = {
  activities: ActivityView[];
  mutate: (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => void;
};

const ActivitiesContext = React.createContext<ActivitiesCtx | null>(null);

export function useActivitiesContext() {
  const ctx = React.useContext(ActivitiesContext);
  if (!ctx) throw new Error("ActivitiesContext required");
  return ctx;
}

type Props = {
  data: BootstrapData;
  initialView?: ViewMode;
  initialGroup?: GroupBy;
  initialScope?: Scope;
  initialLanes?: Lanes;
};

export function AppShell({
  data,
  initialView,
  initialGroup,
  initialScope,
  initialLanes,
}: Props) {
  const { me, member } = useTeam();
  const [search, setSearch] = React.useState("");
  const [group, setGroup] = useQueryState(
    "group",
    parseAsStringEnum(GROUPS).withDefault(initialGroup ?? "status"),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(VIEWS).withDefault(initialView ?? "list"),
  );
  const [scope, setScope] = useQueryState(
    "scope",
    parseAsStringEnum(SCOPES).withDefault(initialScope ?? "team"),
  );
  const [lanes, setLanes] = useQueryState(
    "lanes",
    parseAsStringEnum(LANES).withDefault(initialLanes ?? "none"),
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const everOpenedRef = React.useRef(false);
  if (dialogOpen) everOpenedRef.current = true;

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [viewingId, setViewingId] = React.useState<string | null>(null);
  const statusEverOpenedRef = React.useRef(false);
  if (statusOpen) statusEverOpenedRef.current = true;

  const [optimisticActivities, applyOptimistic] = React.useOptimistic(
    data.activities,
    reducer,
  );

  const meId = me?.id ?? null;
  const mutate = React.useCallback<ActivitiesCtx["mutate"]>(
    (action, server) => {
      React.startTransition(async () => {
        applyOptimistic({ ...action, by: meId });
        try {
          const r = await server();
          if (!r.ok) toast.error(r.error ?? "Falha ao salvar");
        } catch {
          toast.error("Falha de sincronização");
        }
      });
    },
    [applyOptimistic, meId],
  );

  const ctxValue = React.useMemo<ActivitiesCtx>(
    () => ({ activities: optimisticActivities, mutate }),
    [optimisticActivities, mutate],
  );

  const openEdit = React.useCallback((a: ActivityView) => {
    React.startTransition(() => {
      setStatusOpen(false);
      setEditingId(a.id);
      setDialogOpen(true);
    });
  }, []);

  const openView = React.useCallback((a: ActivityView) => {
    React.startTransition(() => {
      setViewingId(a.id);
      setStatusOpen(true);
    });
  }, []);

  const editing = editingId
    ? optimisticActivities.find((a) => a.id === editingId) ?? null
    : null;
  const viewing = viewingId
    ? optimisticActivities.find((a) => a.id === viewingId) ?? null
    : null;

  // Sem identidade escolhida, "Minhas" não tem como filtrar: vale "Da equipe".
  const mineOnly = scope === "mine" && !!me;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && !mineOnly) return optimisticActivities;
    return optimisticActivities.filter((a) => {
      if (mineOnly && me && !isMine(a, me)) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.lastStatus?.toLowerCase().includes(q) ||
        a.journeyName?.toLowerCase().includes(q) ||
        a.assigneeIds.some((id) =>
          member(id)?.name.toLowerCase().includes(q),
        ) ||
        a.blockedBy?.toLowerCase().includes(q)
      );
    });
  }, [optimisticActivities, search, mineOnly, me, member]);

  return (
    <ActivitiesContext.Provider value={ctxValue}>
      <div className="flex h-full flex-col pb-4">
        <div className="animate-fade-in mx-auto flex w-full max-w-[1200px] min-h-0 flex-1 flex-col overflow-hidden">
          <TeamLoad activities={optimisticActivities} stages={data.stages} />
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            scope={mineOnly ? "mine" : "team"}
            onScopeChange={setScope}
            canFilterMine={!!me}
            group={group}
            onGroupChange={setGroup}
            lanes={lanes}
            onLanesChange={setLanes}
            view={view}
            onViewChange={setView}
          />
          <QuickAdd
            stages={data.stages}
            journeys={data.journeys}
            assignees={data.assignees}
          />
          <div className="flex-1 min-h-0 overflow-hidden px-4 py-3">
            <div className="scrollbar-hide h-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            {view === "board" ? (
              <BoardView
                activities={filtered}
                stages={data.stages}
                lanes={lanes}
                onView={openView}
              />
            ) : (
              <ListView
                activities={filtered}
                stages={data.stages}
                journeys={data.journeys}
                assignees={data.assignees}
                group={group}
                onEdit={openEdit}
                onView={openView}
              />
            )}
            </div>
          </div>
        </div>
        {everOpenedRef.current && (
          <ActivityDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            stages={data.stages}
            journeys={data.journeys}
            assignees={data.assignees}
            initial={editing}
          />
        )}
        {statusEverOpenedRef.current && (
          <ActivityStatusDialog
            open={statusOpen}
            onOpenChange={setStatusOpen}
            activity={viewing}
            onEdit={openEdit}
          />
        )}
      </div>
    </ActivitiesContext.Provider>
  );
}

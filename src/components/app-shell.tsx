"use client";

import * as React from "react";
import { toast } from "sonner";
import { Toolbar } from "@/components/toolbar";
import dynamic from "next/dynamic";
import { ListView } from "@/components/list-view";
import { BoardView } from "@/components/board-view";
import { QuickAdd } from "@/components/quick-add";

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
  GroupBy,
  ViewMode,
} from "@/lib/types";
import { useQueryState, parseAsStringEnum } from "nuqs";

const GROUPS: GroupBy[] = ["status", "journey", "assignee"];
const VIEWS: ViewMode[] = ["list", "board"];

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
      assigneeId?: string | null;
      assigneeName?: string | null;
      assigneeInitials?: string | null;
      assigneeColor?: string | null;
      position?: string;
    }
  | {
      type: "addStatus";
      activityId: string;
      status: { id: string; content: string; createdAt: Date };
    }
  | { type: "removeStatus"; activityId: string; statusId: string };

function reducer(state: ActivityView[], action: Mutation): ActivityView[] {
  switch (action.type) {
    case "create":
      return [action.activity, ...state];
    case "update":
      return state.map((a) =>
        a.id === action.activity.id ? action.activity : a,
      );
    case "delete":
      return state.filter((a) => a.id !== action.id);
    case "move": {
      const next = state.map((a) => {
        if (a.id !== action.id) return a;
        const out: ActivityView = { ...a };
        if (action.stageId !== undefined) {
          out.stageId = action.stageId;
          out.stageName = action.stageName ?? null;
          out.stageColor = action.stageColor ?? null;
        }
        if (action.journeyId !== undefined) {
          out.journeyId = action.journeyId;
          out.journeyName = action.journeyName ?? null;
          out.journeyColor = action.journeyColor ?? null;
        }
        if (action.assigneeId !== undefined) {
          out.assigneeId = action.assigneeId;
          out.assigneeName = action.assigneeName ?? null;
          out.assigneeInitials = action.assigneeInitials ?? null;
          out.assigneeColor = action.assigneeColor ?? null;
        }
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
              ...a,
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
};

export function AppShell({ data, initialView, initialGroup }: Props) {
  const [search, setSearch] = React.useState("");
  const [group, setGroup] = useQueryState(
    "group",
    parseAsStringEnum(GROUPS).withDefault(initialGroup ?? "status"),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(VIEWS).withDefault(initialView ?? "list"),
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

  const mutate = React.useCallback<ActivitiesCtx["mutate"]>(
    (action, server) => {
      React.startTransition(async () => {
        applyOptimistic(action);
        try {
          const r = await server();
          if (!r.ok) toast.error(r.error ?? "Falha ao salvar");
        } catch {
          toast.error("Falha de sincronização");
        }
      });
    },
    [applyOptimistic],
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

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optimisticActivities;
    return optimisticActivities.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        a.lastStatus?.toLowerCase().includes(q) ||
        a.journeyName?.toLowerCase().includes(q) ||
        a.assigneeName?.toLowerCase().includes(q)
      );
    });
  }, [optimisticActivities, search]);

  return (
    <ActivitiesContext.Provider value={ctxValue}>
      <div className="flex h-full flex-col bg-[var(--color-canvas)] pb-4">
        <div className="animate-fade-in mx-auto flex w-full max-w-[1200px] min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl bg-[var(--color-background)] shadow-[0_0_0_1px_var(--color-border)]">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            group={group}
            onGroupChange={setGroup}
            view={view}
            onViewChange={setView}
          />
          <QuickAdd
            stages={data.stages}
            journeys={data.journeys}
            assignees={data.assignees}
          />
          <div className="flex-1 min-h-0 overflow-hidden bg-[var(--color-canvas)] px-4 py-3">
            <div className="scrollbar-hide h-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            {view === "board" ? (
              <BoardView
                activities={filtered}
                stages={data.stages}
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

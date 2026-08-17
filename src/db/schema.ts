import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
  date,
  boolean,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#94a3b8"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    positionIdx: index("stages_position_idx").on(t.position),
  }),
);

export const journeys = pgTable("journeys", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#a5b4fc"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const assignees = pgTable("assignees", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  initials: text("initials").notNull(),
  color: text("color").notNull().default("#cbd5e1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#fbbf24"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    dueDate: date("due_date"),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "restrict" }),
    journeyId: uuid("journey_id").references(() => journeys.id, {
      onDelete: "set null",
    }),
    assigneeId: uuid("assignee_id").references(() => assignees.id, {
      onDelete: "set null",
    }),
    priority: priorityEnum("priority").notNull().default("medium"),
    position: numeric("position", { precision: 38, scale: 18 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    stageIdx: index("activities_stage_idx").on(t.stageId, t.position),
    journeyIdx: index("activities_journey_idx").on(t.journeyId),
    assigneeIdx: index("activities_assignee_idx").on(t.assigneeId),
  }),
);

export const activityTags = pgTable(
  "activity_tags",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.activityId, t.tagId] }),
    tagIdx: index("activity_tags_tag_idx").on(t.tagId),
  }),
);

export const activityStatusUpdates = pgTable(
  "activity_status_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    activityIdx: index("status_updates_activity_idx").on(
      t.activityId,
      t.createdAt,
    ),
  }),
);

// --- Notas & Lembretes (espaço pessoal) ---

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    createdIdx: index("notes_created_idx").on(t.createdAt),
  }),
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    content: text("content").notNull(),
    dueDate: date("due_date"),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    dueIdx: index("reminders_due_idx").on(t.done, t.dueDate),
  }),
);

export const links = pgTable(
  "links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    category: text("category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    createdIdx: index("links_created_idx").on(t.createdAt),
  }),
);

export const savedQueries = pgTable(
  "saved_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    position: numeric("position", { precision: 38, scale: 18 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    positionIdx: index("saved_queries_position_idx").on(t.position),
  }),
);

// --- Mural "Foco do dia" (conferência diária com sequência) ---

export const boardStatusEnum = pgEnum("board_status", [
  "risco",
  "atencao",
  "em_dia",
]);

export const boardItems = pgTable(
  "board_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    detail: text("detail"),
    status: boardStatusEnum("status").notNull().default("em_dia"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    createdIdx: index("board_items_created_idx").on(t.createdAt),
  }),
);

export const boardCheckins = pgTable(
  "board_checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => boardItems.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    itemDayUniq: unique("board_checkins_item_day_uniq").on(t.itemId, t.day),
    itemIdx: index("board_checkins_item_idx").on(t.itemId),
  }),
);

export const boardItemsRelations = relations(boardItems, ({ many }) => ({
  checkins: many(boardCheckins),
}));

export const boardCheckinsRelations = relations(boardCheckins, ({ one }) => ({
  item: one(boardItems, {
    fields: [boardCheckins.itemId],
    references: [boardItems.id],
  }),
}));

export const stagesRelations = relations(stages, ({ many }) => ({
  activities: many(activities),
}));

export const journeysRelations = relations(journeys, ({ many }) => ({
  activities: many(activities),
}));

export const assigneesRelations = relations(assignees, ({ many }) => ({
  activities: many(activities),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  activityTags: many(activityTags),
}));

export const activityTagsRelations = relations(activityTags, ({ one }) => ({
  activity: one(activities, {
    fields: [activityTags.activityId],
    references: [activities.id],
  }),
  tag: one(tags, { fields: [activityTags.tagId], references: [tags.id] }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  stage: one(stages, { fields: [activities.stageId], references: [stages.id] }),
  journey: one(journeys, {
    fields: [activities.journeyId],
    references: [journeys.id],
  }),
  assignee: one(assignees, {
    fields: [activities.assigneeId],
    references: [assignees.id],
  }),
  tags: many(activityTags),
  statusUpdates: many(activityStatusUpdates),
}));

export const activityStatusUpdatesRelations = relations(
  activityStatusUpdates,
  ({ one }) => ({
    activity: one(activities, {
      fields: [activityStatusUpdates.activityId],
      references: [activities.id],
    }),
  }),
);

export type Stage = typeof stages.$inferSelect;
export type Journey = typeof journeys.$inferSelect;
export type Assignee = typeof assignees.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ActivityStatusUpdate = typeof activityStatusUpdates.$inferSelect;
export type Priority = (typeof priorityEnum.enumValues)[number];
export type Note = typeof notes.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type LinkItem = typeof links.$inferSelect;
export type SavedQuery = typeof savedQueries.$inferSelect;
export type BoardItem = typeof boardItems.$inferSelect;
export type BoardCheckin = typeof boardCheckins.$inferSelect;
export type BoardStatus = (typeof boardStatusEnum.enumValues)[number];

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
  primaryKey,
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

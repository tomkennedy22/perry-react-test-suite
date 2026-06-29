import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const notes = sqliteTable("notes", {
  id:        integer("id").primaryKey(),
  body:      text("body").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert

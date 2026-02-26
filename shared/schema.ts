import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const petTypeEnum = pgEnum("pet_type", ["dog", "cat"]);
export const calendarStatusEnum = pgEnum("calendar_status", [
  "pending",
  "generating",
  "ready",
  "purchased",
]);

export const calendars = pgTable("calendars", {
  id: serial("id").primaryKey(),
  petName: text("pet_name").notNull(),
  petType: petTypeEnum("pet_type").notNull(),
  photoData: text("photo_data").notNull(),
  status: calendarStatusEnum("status").default("pending").notNull(),
  customerEmail: text("customer_email"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const calendarMonths = pgTable("calendar_months", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id").notNull().references(() => calendars.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  holidayName: text("holiday_name").notNull(),
  imageUrl: text("image_url"),
  generated: integer("generated").default(0).notNull(),
});

export const insertCalendarSchema = createInsertSchema(calendars).omit({
  id: true,
  status: true,
  customerEmail: true,
  stripeSessionId: true,
  createdAt: true,
});
export type InsertCalendar = z.infer<typeof insertCalendarSchema>;
export type Calendar = typeof calendars.$inferSelect;

export const insertCalendarMonthSchema = createInsertSchema(calendarMonths).omit({
  id: true,
  generated: true,
});
export type InsertCalendarMonth = z.infer<typeof insertCalendarMonthSchema>;
export type CalendarMonth = typeof calendarMonths.$inferSelect;

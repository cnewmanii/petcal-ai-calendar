import { db } from "./db";
import { calendars, calendarMonths, type Calendar, type CalendarMonth, type InsertCalendar } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  createCalendar(data: InsertCalendar): Promise<Calendar>;
  getCalendar(id: number): Promise<Calendar | undefined>;
  updateCalendarStatus(id: number, status: string): Promise<void>;
  updateCalendarPurchased(id: number, sessionId: string, email: string): Promise<void>;
  getCalendarBySession(sessionId: string): Promise<Calendar | undefined>;
  getCalendarMonths(calendarId: number): Promise<CalendarMonth[]>;
  createCalendarMonth(calendarId: number, month: number, holidayName: string): Promise<CalendarMonth>;
  updateCalendarMonthImage(id: number, imageUrl: string): Promise<void>;
  getGeneratedMonthCount(calendarId: number): Promise<number>;
}

export const storage: IStorage = {
  async createCalendar(data: InsertCalendar): Promise<Calendar> {
    const [calendar] = await db.insert(calendars).values(data).returning();
    return calendar;
  },

  async getCalendar(id: number): Promise<Calendar | undefined> {
    const [calendar] = await db.select().from(calendars).where(eq(calendars.id, id));
    return calendar;
  },

  async updateCalendarStatus(id: number, status: string): Promise<void> {
    await db.update(calendars).set({ status: status as any }).where(eq(calendars.id, id));
  },

  async updateCalendarPurchased(id: number, sessionId: string, email: string): Promise<void> {
    await db.update(calendars)
      .set({ status: "purchased", stripeSessionId: sessionId, customerEmail: email })
      .where(eq(calendars.id, id));
  },

  async getCalendarBySession(sessionId: string): Promise<Calendar | undefined> {
    const [calendar] = await db.select().from(calendars).where(eq(calendars.stripeSessionId, sessionId));
    return calendar;
  },

  async getCalendarMonths(calendarId: number): Promise<CalendarMonth[]> {
    return db.select().from(calendarMonths).where(eq(calendarMonths.calendarId, calendarId));
  },

  async createCalendarMonth(calendarId: number, month: number, holidayName: string): Promise<CalendarMonth> {
    const [row] = await db.insert(calendarMonths).values({ calendarId, month, holidayName }).returning();
    return row;
  },

  async updateCalendarMonthImage(id: number, imageUrl: string): Promise<void> {
    await db.update(calendarMonths).set({ imageUrl, generated: 1 }).where(eq(calendarMonths.id, id));
  },

  async getGeneratedMonthCount(calendarId: number): Promise<number> {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM calendar_months WHERE calendar_id = ${calendarId} AND generated = 1`
    );
    return parseInt((result.rows[0] as any).count, 10);
  },
};

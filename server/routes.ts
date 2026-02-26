import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { toFile } from "openai";
import { storage } from "./storage";
import { stripeEnabled } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CALENDAR_PRICE_CENTS = 2999;

const MONTHS = [
  { month: 1, holiday: "New Year's Day", prompt: "celebrating New Year's Day with party hats, confetti, and fireworks" },
  { month: 2, holiday: "Valentine's Day", prompt: "surrounded by hearts and roses for Valentine's Day, with a cute love theme" },
  { month: 3, holiday: "St. Patrick's Day", prompt: "wearing a tiny green hat for St. Patrick's Day, with shamrocks and gold" },
  { month: 4, holiday: "Easter", prompt: "with colorful Easter eggs and spring flowers, wearing bunny ears" },
  { month: 5, holiday: "Mother's Day", prompt: "with a bouquet of flowers for Mother's Day, in a soft spring setting" },
  { month: 6, holiday: "Summer Solstice", prompt: "playing at the beach on a sunny summer day, splashing in waves" },
  { month: 7, holiday: "Independence Day", prompt: "with American flags and fireworks for the 4th of July, patriotic and festive" },
  { month: 8, holiday: "National Pet Day", prompt: "playing happily outdoors on National Pet Day, wearing a colorful bandana" },
  { month: 9, holiday: "Back to School", prompt: "sitting next to school books and an apple, looking curious and studious" },
  { month: 10, holiday: "Halloween", prompt: "wearing a cute Halloween costume with pumpkins and bats in the background" },
  { month: 11, holiday: "Thanksgiving", prompt: "sitting at a cozy Thanksgiving table with autumn leaves, pumpkins, and harvest decorations" },
  { month: 12, holiday: "Christmas", prompt: "wearing a Santa hat next to a decorated Christmas tree with wrapped presents and snowflakes" },
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function generateMonthImages(calendarId: number, petName: string, petType: string, photoBuffer: Buffer) {
  await storage.updateCalendarStatus(calendarId, "generating");

  const genDir = path.join(process.cwd(), "client", "public", "generated", String(calendarId));
  fs.mkdirSync(genDir, { recursive: true });

  for (const monthInfo of MONTHS) {
    try {
      const monthRow = await storage.createCalendarMonth(calendarId, monthInfo.month, monthInfo.holiday);

      const prompt = `A charming, high-quality digital illustration of a ${petType} named ${petName} ${monthInfo.prompt}. The ${petType} is the main subject, depicted in a warm and playful illustration style suitable for a wall calendar. Keep the pet's appearance consistent and adorable.`;

      const imageFile = await toFile(photoBuffer, "pet.png", { type: "image/png" });

      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        n: 1,
        size: "1024x1024",
      });

      const base64 = response.data[0]?.b64_json;
      if (base64) {
        const imgPath = path.join(genDir, `${monthInfo.month}.png`);
        fs.writeFileSync(imgPath, Buffer.from(base64, "base64"));
        await storage.updateCalendarMonthImage(monthRow.id, `/generated/${calendarId}/${monthInfo.month}.png`);
      }
    } catch (err) {
      console.error(`Error generating month ${monthInfo.month}:`, err);
    }
  }

  await storage.updateCalendarStatus(calendarId, "ready");
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/stripe/status", async (req: Request, res: Response) => {
    res.json({ enabled: stripeEnabled });
  });

  app.get("/api/stripe/publishable-key", async (req: Request, res: Response) => {
    if (!stripeEnabled) return res.status(503).json({ error: "Payments are not yet configured" });
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ error: "Failed to get publishable key" });
    }
  });

  app.post("/api/calendars", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      const { petName, petType } = req.body;
      if (!req.file) return res.status(400).json({ error: "Photo is required" });
      if (!petName || !petType) return res.status(400).json({ error: "Pet name and type are required" });

      const photoData = req.file.buffer.toString("base64");

      const calendar = await storage.createCalendar({
        petName,
        petType: petType as "dog" | "cat",
        photoData,
      });

      res.json({ id: calendar.id, status: calendar.status });

      generateMonthImages(calendar.id, petName, petType, req.file.buffer).catch(console.error);
    } catch (err) {
      console.error("Create calendar error:", err);
      res.status(500).json({ error: "Failed to create calendar" });
    }
  });

  app.get("/api/calendars/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const calendar = await storage.getCalendar(id);
      if (!calendar) return res.status(404).json({ error: "Calendar not found" });

      const months = await storage.getCalendarMonths(id);
      const generatedCount = months.filter((m) => m.generated === 1).length;

      res.json({
        ...calendar,
        months: months.sort((a, b) => a.month - b.month),
        generatedCount,
        totalMonths: 12,
        photoData: undefined,
      });
    } catch (err) {
      console.error("Get calendar error:", err);
      res.status(500).json({ error: "Failed to get calendar" });
    }
  });

  app.get("/api/calendars/:id/months", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const months = await storage.getCalendarMonths(id);
      const generatedCount = months.filter((m) => m.generated === 1).length;
      res.json({ months: months.sort((a, b) => a.month - b.month), generatedCount });
    } catch (err) {
      res.status(500).json({ error: "Failed to get months" });
    }
  });

  app.post("/api/checkout", async (req: Request, res: Response) => {
    if (!stripeEnabled) return res.status(503).json({ error: "Payments are coming soon! Check back later." });
    try {
      const { calendarId, email } = req.body;
      if (!calendarId) return res.status(400).json({ error: "Calendar ID is required" });

      const calendar = await storage.getCalendar(parseInt(calendarId));
      if (!calendar) return res.status(404).json({ error: "Calendar not found" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: CALENDAR_PRICE_CENTS,
              product_data: {
                name: `${calendar.petName}'s Custom Pet Calendar`,
                description: `A beautiful 12-month wall calendar featuring ${calendar.petName} celebrating major holidays throughout the year.`,
                images: [],
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: email || undefined,
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&calendar_id=${calendarId}`,
        cancel_url: `${baseUrl}/calendar/${calendarId}`,
        metadata: {
          calendarId: String(calendarId),
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/checkout/verify", async (req: Request, res: Response) => {
    if (!stripeEnabled) return res.status(503).json({ error: "Payments not configured" });
    try {
      const { session_id, calendar_id } = req.query;
      if (!session_id || !calendar_id) return res.status(400).json({ error: "Missing params" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      if (session.payment_status === "paid") {
        await storage.updateCalendarPurchased(
          parseInt(calendar_id as string),
          session_id as string,
          session.customer_email || ""
        );
        const calendar = await storage.getCalendar(parseInt(calendar_id as string));
        const months = await storage.getCalendarMonths(parseInt(calendar_id as string));
        return res.json({ success: true, calendar: { ...calendar, months: months.sort((a, b) => a.month - b.month) } });
      }

      res.json({ success: false });
    } catch (err) {
      console.error("Verify error:", err);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  return httpServer;
}

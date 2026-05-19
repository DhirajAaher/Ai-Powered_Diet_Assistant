import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOpenaiConversationBody, SendOpenaiMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { gemini, GEMINI_MODEL } from "../lib/gemini";
import { awardPoints } from "../lib/gamification.js";

const router = Router();

router.use(requireAuth);

const DIET_SYSTEM_PROMPT = `You are NutriAI, an expert AI diet and nutrition assistant. You help users with:
- Personalized diet and meal recommendations
- Nutritional information and calorie counts
- Healthy food alternatives and substitutions
- Meal planning and recipe suggestions
- Weight management tips and strategies
- Exercise and nutrition synergy
- Dietary restrictions and preferences (vegetarian, vegan, keto, etc.)

Be friendly, encouraging, and provide specific, actionable advice. Keep responses concise and practical.
Always remind users to consult healthcare professionals for medical nutrition advice.`;

router.get("/conversations", async (req: AuthRequest, res) => {
  const convs = await db.select().from(conversations).orderBy(conversations.createdAt);
  // Reverse to show newest first in the sidebar
  res.json([...convs].reverse());
});

router.post("/conversations", async (req: AuthRequest, res) => {
  const parse = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const [result] = await db.insert(conversations).values({ title: parse.data.title });
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, result.insertId));
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parse = SendOpenaiMessageBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: parse.data.content,
  });

  // Get conversation history
  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  const chatMessages = [
    { role: "system" as const, content: DIET_SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await gemini.chat.completions.create({
      model: GEMINI_MODEL,
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    req.log.info({ conversationId: id }, "Starting AI chat stream");

    for await (const chunk of stream) {
      if (!chunk.choices || chunk.choices.length === 0) continue;
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Award points
    await awardPoints(req.userId!, "chat_message");
  } catch (error) {
    req.log.error({ error }, "Error in OpenAI chat stream");
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
    res.end();
  }
});

export default router;

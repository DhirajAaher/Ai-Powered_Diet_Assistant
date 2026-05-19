
import 'dotenv/config';
import { db, messages } from "@workspace/db";
import { desc } from "drizzle-orm";

async function main() {
  try {
    const msgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(5);
    console.log("Last 5 messages:", JSON.stringify(msgs, null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit();
  }
}

main();

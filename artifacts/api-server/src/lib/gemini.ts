import OpenAI from "openai";
import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

// Primary Client Setup
const ollamaClient = OLLAMA_BASE_URL ? new OpenAI({
  apiKey: "ollama",
  baseURL: OLLAMA_BASE_URL,
  timeout: 180000, // Increased to 180 seconds
  maxRetries: 0,
}) : null;

const geminiClient = null;
const openaiClient = null;



export const GEMINI_MODEL = "gemini-1.5-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-2.0-flash";
export const FALLBACK_MODEL = "gpt-4o-mini";

export const gemini = {
  chat: {
    completions: {
      create: async (params: any) => {
        if (!ollamaClient) {
          throw new Error("Ollama is not configured. OLLAMA_BASE_URL is missing.");
        }

        // Normalize parameters for OpenAI compatibility
        const normalizedParams = {
          ...params,
          max_tokens: params.max_completion_tokens || params.max_tokens,
        };
        delete normalizedParams.max_completion_tokens;

        try {
          logger.info({ model: OLLAMA_MODEL, provider: "Ollama" }, "Attempting completion with Ollama");
          return await ollamaClient.chat.completions.create({
            ...normalizedParams,
            model: OLLAMA_MODEL,
          });
        } catch (err: any) {
          logger.error({ error: err.message }, "Ollama failed");
          throw err;
        }
      }
    }
  }
};




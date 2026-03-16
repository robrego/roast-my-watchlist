import { NextRequest } from "next/server";
import { Mistral } from "@mistralai/mistralai";
import { buildRoastPrompt, buildSuggestionsPrompt } from "@/lib/roastPrompt";
import { RoastRequest } from "@/lib/types";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { movies, intensity, suggestionsOnly, lang = "en" } = body as RoastRequest & {
    suggestionsOnly?: boolean;
    lang?: "en" | "it";
  };

  if (!movies?.length || !intensity) {
    return new Response("Missing movies or intensity", { status: 400 });
  }

  const prompt = suggestionsOnly
    ? buildSuggestionsPrompt(movies, lang)
    : buildRoastPrompt(movies, intensity, lang);

  const stream = await client.chat.stream({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.data.choices[0]?.delta?.content;
        if (text && typeof text === "string") {
          const clean = text.replace(/\*/g, "").replace(/"/g, "").replace(/"/g, "").replace(/"/g, "");
          controller.enqueue(encoder.encode(clean));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
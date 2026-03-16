#!/bin/bash


# ── Init Next.js project ─────────────────────────────────────
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes

# ── Install dependencies ─────────────────────────────────────
npm install @anthropic-ai/sdk
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge

echo "📁 Creating project structure..."

# ── Directories ──────────────────────────────────────────────
mkdir -p app/api/roast
mkdir -p app/api/tmdb
mkdir -p components
mkdir -p lib

# ============================================================
#  lib/types.ts
# ============================================================
cat > lib/types.ts << 'EOF'
export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genres?: string[];
  director?: string;
  tagline?: string;
  overview?: string;
}

export type Intensity = "mild" | "spicy" | "brutal";

export interface RoastRequest {
  movies: Movie[];
  intensity: Intensity;
}
EOF

# ============================================================
#  lib/roastPrompt.ts
# ============================================================
cat > lib/roastPrompt.ts << 'EOF'
import { Movie, Intensity } from "./types";

const PERSONAS = {
  mild: {
    name: "Professor Elliot Marsh",
    description: `You are Professor Elliot Marsh — a film studies lecturer who genuinely
wanted to believe in people. You are disappointed, but not yet broken. You write like
a kind mentor who has seen too much. Your roast is a sigh, not a scream. You use
phrases like "I had hoped..." and "What this tells me about you is..."`,
    signoff: "With diminishing hope,\nProf. E. Marsh",
  },
  spicy: {
    name: "xX_cinematheque_Xx",
    description: `You are a Letterboxd obsessive with 4,000 logged films and zero patience.
You rate everything, you remember everything, and you take other people's taste as a
personal attack. You write in sharp, punchy sentences. You reference the director's
other work to make the person feel ignorant. You use phrases like "this is giving..."
and "the audacity of adding X when Y exists."`,
    signoff: "Logged. 1.5 stars. Moving on.",
  },
  brutal: {
    name: "Jean-Pierre Renaud",
    description: `You are Jean-Pierre Renaud — 74 years old, former Cahiers du Cinéma
contributor, and you consider Hollywood cinema a form of cultural vandalism. You write
in long, devastating sentences. You are not angry — you are beyond anger. You are
sorrowful in a way that is worse than anger. You reference Bresson, Tarkovsky, and
Varda to contrast what cinema can be versus what this person has chosen.`,
    signoff: "Yours in mourning,\nJ-P. Renaud, Paris",
  },
};

export function buildRoastPrompt(movies: Movie[], intensity: Intensity): string {
  const persona = PERSONAS[intensity];

  const movieData = movies.map((m) => ({
    title: m.title,
    year: m.release_date?.split("-")[0],
    genres: m.genres?.join(", "),
    director: m.director,
    rating: m.vote_average?.toFixed(1),
    tagline: m.tagline,
  }));

  return `${persona.description}

You have been handed a watchlist to review. Your job is to write a roast — a single,
cohesive piece of criticism — about the PERSON based on what their movie choices reveal
about them. Do not review the movies themselves. Review the HUMAN who chose them.

Rules:
- Find PATTERNS across the list (themes, directors, decades, tone). Call them out.
- Be specific. Reference actual details from the films provided.
- Never be mean about the person's intelligence — be mean about their taste and what it
  MEANS. There's a difference.
- Length: 180–250 words. Not a word more.
- End with the exact signoff: "${persona.signoff}"
- Format it like a letter or a printed receipt. No headers, no bullet points.

The watchlist:
${JSON.stringify(movieData, null, 2)}

Write the roast now. Stay in character as ${persona.name} the entire time.`;
}
EOF

# ============================================================
#  lib/tmdb.ts
# ============================================================
cat > lib/tmdb.ts << 'EOF'
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

export function getPosterUrl(path: string | null): string {
  if (!path) return "/placeholder-poster.png";
  return `${TMDB_IMAGE_BASE}${path}`;
}
EOF

# ============================================================
#  app/api/tmdb/route.ts
# ============================================================
cat > app/api/tmdb/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const movieId = req.nextUrl.searchParams.get("id");

  if (!KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY not set" }, { status: 500 });
  }

  if (movieId) {
    const [details, credits] = await Promise.all([
      fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${KEY}`).then((r) => r.json()),
      fetch(`${TMDB_BASE}/movie/${movieId}/credits?api_key=${KEY}`).then((r) => r.json()),
    ]);
    const director = credits.crew?.find((p: { job: string; name: string }) => p.job === "Director")?.name;
    return NextResponse.json({
      ...details,
      genres: details.genres?.map((g: { name: string }) => g.name),
      director,
    });
  }

  if (query) {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`
    );
    const data = await res.json();
    return NextResponse.json(data.results?.slice(0, 5) ?? []);
  }

  return NextResponse.json({ error: "Missing query or id" }, { status: 400 });
}
EOF

# ============================================================
#  app/api/roast/route.ts
# ============================================================
cat > app/api/roast/route.ts << 'EOF'
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildRoastPrompt } from "@/lib/roastPrompt";
import { RoastRequest } from "@/lib/types";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const body: RoastRequest = await req.json();
  const { movies, intensity } = body;

  if (!movies?.length || !intensity) {
    return new Response("Missing movies or intensity", { status: 400 });
  }

  const prompt = buildRoastPrompt(movies, intensity);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
EOF

# ============================================================
#  components/MovieSlot.tsx
# ============================================================
cat > components/MovieSlot.tsx << 'EOF'
"use client";

import { useState, useRef, useEffect } from "react";
import { Movie } from "@/lib/types";
import { getPosterUrl } from "@/lib/tmdb";

interface Props {
  index: number;
  movie: Movie | null;
  onSelect: (movie: Movie) => void;
  onRemove: () => void;
}

export default function MovieSlot({ index, movie, onSelect, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/tmdb?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
      setLoading(false);
    }, 350);
  }, [query]);

  async function handleSelect(m: Movie) {
    setOpen(false);
    setQuery("");
    // Fetch full details (director, genres, tagline)
    const res = await fetch(`/api/tmdb?id=${m.id}`);
    const full = await res.json();
    onSelect(full);
  }

  if (movie) {
    return (
      <div className="relative group w-[140px]">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
          {movie.poster_path ? (
            <img
              src={getPosterUrl(movie.poster_path)}
              alt={movie.title}
              className="w-full h-[210px] object-cover"
            />
          ) : (
            <div className="w-full h-[210px] flex items-center justify-center bg-zinc-800 text-zinc-500 text-xs text-center px-2">
              {movie.title}
            </div>
          )}
          {/* Film noise overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: "url('/noise.png')", backgroundRepeat: "repeat" }} />
          {/* Remove button */}
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400 text-center truncate">{movie.title}</p>
        <p className="text-xs text-zinc-600 text-center">{movie.release_date?.split("-")[0]}</p>
      </div>
    );
  }

  return (
    <div className="relative w-[140px]">
      <div className="w-full h-[210px] rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
        <span className="text-zinc-600 text-2xl">+</span>
        <span className="text-zinc-600 text-xs">Film {index + 1}</span>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="mt-2 w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 w-56 z-50 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 cursor-pointer"
            >
              {r.poster_path && (
                <img src={getPosterUrl(r.poster_path)} alt="" className="w-8 h-12 object-cover rounded" />
              )}
              <div>
                <p className="text-xs text-white font-medium leading-tight">{r.title}</p>
                <p className="text-xs text-zinc-500">{r.release_date?.split("-")[0]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <p className="absolute top-full mt-1 left-0 text-xs text-zinc-500 px-2">Searching...</p>
      )}
    </div>
  );
}
EOF

# ============================================================
#  components/IntensityPicker.tsx
# ============================================================
cat > components/IntensityPicker.tsx << 'EOF'
"use client";

import { Intensity } from "@/lib/types";

interface Props {
  value: Intensity;
  onChange: (v: Intensity) => void;
}

const OPTIONS: { value: Intensity; label: string; desc: string; color: string }[] = [
  { value: "mild", label: "Mild", desc: "Disappointed mentor", color: "border-blue-500/60 text-blue-400" },
  { value: "spicy", label: "Spicy", desc: "Letterboxd snob", color: "border-orange-500/60 text-orange-400" },
  { value: "brutal", label: "Brutal", desc: "Cahiers du Cinéma", color: "border-red-500/60 text-red-400" },
];

export default function IntensityPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-3 px-4 rounded-lg border transition-all text-left ${
            value === opt.value
              ? `${opt.color} bg-white/5`
              : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
          }`}
        >
          <p className="text-sm font-medium">{opt.label}</p>
          <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}
EOF

# ============================================================
#  components/RoastReceipt.tsx
# ============================================================
cat > components/RoastReceipt.tsx << 'EOF'
"use client";

import { useEffect, useRef } from "react";

interface Props {
  text: string;
  streaming: boolean;
}

export default function RoastReceipt({ text, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text]);

  if (!text && !streaming) return null;

  return (
    <div className="relative mt-8 mx-auto max-w-xl">
      {/* Receipt top tear */}
      <div className="w-full h-4 bg-amber-50 dark:bg-zinc-100"
        style={{ clipPath: "polygon(0 100%, 2% 0, 4% 100%, 6% 0, 8% 100%, 10% 0, 12% 100%, 14% 0, 16% 100%, 18% 0, 20% 100%, 22% 0, 24% 100%, 26% 0, 28% 100%, 30% 0, 32% 100%, 34% 0, 36% 100%, 38% 0, 40% 100%, 42% 0, 44% 100%, 46% 0, 48% 100%, 50% 0, 52% 100%, 54% 0, 56% 100%, 58% 0, 60% 100%, 62% 0, 64% 100%, 66% 0, 68% 100%, 70% 0, 72% 100%, 74% 0, 76% 100%, 78% 0, 80% 100%, 82% 0, 84% 100%, 86% 0, 88% 100%, 90% 0, 92% 100%, 94% 0, 96% 100%, 98% 0, 100% 100%)" }}
      />
      {/* Receipt body */}
      <div className="bg-amber-50 dark:bg-zinc-100 px-8 py-6">
        <div className="text-center mb-4 border-b border-dashed border-zinc-400 pb-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">The Critic&apos;s Darkroom</p>
          <p className="text-xs text-zinc-400 font-mono mt-1">— Official Verdict —</p>
        </div>
        <p className="font-mono text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {text}
          {streaming && <span className="animate-pulse">▋</span>}
        </p>
        <div ref={bottomRef} />
      </div>
      {/* Receipt bottom tear */}
      <div className="w-full h-4 bg-amber-50 dark:bg-zinc-100"
        style={{ clipPath: "polygon(0 0, 2% 100%, 4% 0, 6% 100%, 8% 0, 10% 100%, 12% 0, 14% 100%, 16% 0, 18% 100%, 20% 0, 22% 100%, 24% 0, 26% 100%, 28% 0, 30% 100%, 32% 0, 34% 100%, 36% 0, 38% 100%, 40% 0, 42% 100%, 44% 0, 46% 100%, 48% 0, 50% 100%, 52% 0, 54% 100%, 56% 0, 58% 100%, 60% 0, 62% 100%, 64% 0, 66% 100%, 68% 0, 70% 100%, 72% 0, 74% 100%, 76% 0, 78% 100%, 80% 0, 82% 100%, 84% 0, 86% 100%, 88% 0, 90% 100%, 92% 0, 94% 100%, 96% 0, 98% 100%, 100% 0)" }}
      />
    </div>
  );
}
EOF

# ============================================================
#  app/layout.tsx
# ============================================================
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Critic's Darkroom",
  description: "Submit your watchlist. Receive your verdict.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-[#050505] text-white antialiased">{children}</body>
    </html>
  );
}
EOF

# ============================================================
#  app/globals.css
# ============================================================
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-playfair: 'Playfair Display', serif;
  --font-inter: 'Inter', sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  background: #050505;
  min-height: 100vh;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: #111;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}
EOF

# ============================================================
#  app/page.tsx
# ============================================================
cat > app/page.tsx << 'EOF'
"use client";

import { useState } from "react";
import { Movie, Intensity } from "@/lib/types";
import MovieSlot from "@/components/MovieSlot";
import IntensityPicker from "@/components/IntensityPicker";
import RoastReceipt from "@/components/RoastReceipt";

const MAX_MOVIES = 5;

export default function Home() {
  const [movies, setMovies] = useState<(Movie | null)[]>(Array(3).fill(null));
  const [intensity, setIntensity] = useState<Intensity>("spicy");
  const [roastText, setRoastText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const selectedMovies = movies.filter(Boolean) as Movie[];
  const canAddSlot = movies.length < MAX_MOVIES;
  const canRoast = selectedMovies.length >= 2 && !streaming;

  function addSlot() {
    if (canAddSlot) setMovies((prev) => [...prev, null]);
  }

  function handleSelect(index: number, movie: Movie) {
    setMovies((prev) => prev.map((m, i) => (i === index ? movie : m)));
  }

  function handleRemove(index: number) {
    setMovies((prev) => prev.map((m, i) => (i === index ? null : m)));
  }

  async function handleRoast() {
    if (!canRoast) return;
    setRoastText("");
    setError("");
    setStreaming(true);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movies: selectedMovies, intensity }),
      });

      if (!res.ok) throw new Error("Failed to generate roast");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setRoastText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setError("Something went wrong. The critic refused to comment.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-500/70 mb-3 font-inter">
            A Cultural Service
          </p>
          <h1 className="text-4xl md:text-5xl font-playfair font-bold text-white leading-tight">
            The Critic&apos;s Darkroom
          </h1>
          <p className="mt-4 text-zinc-500 font-inter text-sm max-w-sm mx-auto leading-relaxed">
            Submit your watchlist. Receive your verdict. No feelings will be spared.
          </p>
          <div className="mt-6 w-16 h-px bg-amber-500/30 mx-auto" />
        </div>

        {/* Movie Slots */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-4 font-inter">
            Your Watchlist ({selectedMovies.length}/{movies.length})
          </p>
          <div className="flex flex-wrap gap-4">
            {movies.map((movie, i) => (
              <MovieSlot
                key={i}
                index={i}
                movie={movie}
                onSelect={(m) => handleSelect(i, m)}
                onRemove={() => handleRemove(i)}
              />
            ))}
            {canAddSlot && (
              <button
                onClick={addSlot}
                className="w-[140px] h-[210px] rounded-lg border border-dashed border-zinc-800 text-zinc-700 hover:border-zinc-600 hover:text-zinc-500 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xl">+</span>
                <span className="text-xs font-inter">Add film</span>
              </button>
            )}
          </div>
        </div>

        {/* Intensity Picker */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3 font-inter">
            Roast Intensity
          </p>
          <IntensityPicker value={intensity} onChange={setIntensity} />
        </div>

        {/* CTA */}
        <button
          onClick={handleRoast}
          disabled={!canRoast}
          className={`w-full py-4 rounded-lg font-inter text-sm font-medium tracking-wider uppercase transition-all ${
            canRoast
              ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.99]"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          {streaming ? "The critic is writing..." : "Submit to the Critic"}
        </button>
        {!canRoast && !streaming && (
          <p className="text-center text-xs text-zinc-700 mt-2 font-inter">
            Add at least 2 films to proceed
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-center text-xs text-red-400 font-inter">{error}</p>
        )}

        {/* Roast Receipt */}
        <RoastReceipt text={roastText} streaming={streaming} />

        {roastText && !streaming && (
          <div className="text-center mt-6">
            <button
              onClick={() => { setRoastText(""); setMovies(Array(3).fill(null)); }}
              className="text-xs text-zinc-600 hover:text-zinc-400 font-inter underline underline-offset-4 transition-colors"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
EOF

# ============================================================
#  tailwind.config.ts
# ============================================================
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        cinema: {
          black: "#050505",
          gold: "#F59E0B",
          red: "#DC2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
EOF

# ============================================================
#  .env.local
# ============================================================
cat > .env.local << 'EOF'
# Get your free key at: https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key_here

# Get your key at: https://console.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here
EOF

# ============================================================
#  .gitignore additions
# ============================================================
echo ".env.local" >> .gitignore

echo ""
echo "✅ Project scaffolded successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next steps:"
echo ""
echo "  1. Edit .env.local and add your API keys:"
echo "     • TMDB: https://www.themoviedb.org/settings/api"
echo "     • Anthropic: https://console.anthropic.com"
echo ""
echo "  2. Run the dev server:"
echo "     npm run dev"
echo ""
echo "  3. Open http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

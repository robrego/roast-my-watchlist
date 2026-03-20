"use client";

import { useState } from "react";
import { Movie, Intensity } from "@/lib/types";
import MovieSlot from "@/components/MovieSlot";
import RoastReceipt from "@/components/RoastReceipt";
import SuggestionCard from "@/components/SuggestionCard";

const MAX_MOVIES = 5;
const INTENSITIES: Intensity[] = ["mild", "spicy", "brutal"];

const CRITIC_NAMES = {
  mild: "Professor Elliot Marsh",
  spicy: "xX_cinematheque_Xx",
  brutal: "Jean-Pierre Renaud",
};

export default function Home() {
  const [movies, setMovies] = useState<(Movie | null)[]>(Array(3).fill(null));
  const [intensity] = useState<Intensity>(
    () => INTENSITIES[Math.floor(Math.random() * INTENSITIES.length)]
  );
  const [roastText, setRoastText] = useState("");
  const [suggestions, setSuggestions] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"en" | "it">("en");
  const [btnHovered, setBtnHovered] = useState(false);

  const t = lang === "it" ? {
    service: "Un Servizio Culturale",
    title: ["La Camera Oscura", "del Critico"],
    subtitle: "Invia la tua watchlist. Ricevi il verdetto.\nNessun sentimento verrà risparmiato.",
    watchlist: "La Tua Watchlist",
    submit: "Invia al Critico",
    writing: "Il critico sta scrivendo...",
    hint: "Aggiungi almeno 2 film per continuare",
    restart: "Ricomincia",
    error: "Qualcosa è andato storto. Il critico si è rifiutato di commentare.",
  } : {
    service: "A Cultural Service",
    title: ["The Critic's", "Darkroom"],
    subtitle: "Submit your watchlist. Receive your verdict.\nNo feelings will be spared.",
    watchlist: "Your Watchlist",
    submit: "Submit to the Critic",
    writing: "The critic is writing...",
    hint: "Add at least 2 films to proceed",
    restart: "Start over",
    error: "Something went wrong. The critic refused to comment.",
  };

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
    setRoastText(""); setSuggestions(""); setError("");
    setDimmed(true); setStreaming(true);
    const decoder = new TextDecoder();
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movies: selectedMovies, intensity, lang }),
      });
      if (!res.ok) throw new Error("Failed");
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setRoastText((prev) => prev + decoder.decode(value, { stream: true }));
      }
      const sugRes = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movies: selectedMovies, intensity, suggestionsOnly: true, lang }),
      });
      if (sugRes.ok && sugRes.body) {
        const sugReader = sugRes.body.getReader();
        while (true) {
          const { done, value } = await sugReader.read();
          if (done) break;
          setSuggestions((prev) => prev + decoder.decode(value, { stream: true }));
        }
      }
    } catch {
      setError(t.error);
    } finally {
      setStreaming(false); setDimmed(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1a0f00 0%, #050505 60%)",
      color: "white",
      fontFamily: "'Playfair Display', 'Palatino Linotype', Georgia, serif",
      padding: "120px clamp(16px, 4vw, 48px) 80px",
      transition: "filter 0.6s ease",
      filter: dimmed ? "brightness(0.3)" : "brightness(1)",
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-btn {
          background: #f59e0b;
          transition: all 0.3s ease;
        }
        .shimmer-btn:hover {
          background: linear-gradient(90deg, #f59e0b 0%, #fcd34d 40%, #f59e0b 60%, #b45309 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
        }
        .movie-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .movie-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .suggestion-card {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Language toggle */}
      <div style={{ position: "fixed", top: 20, right: 20, display: "flex", gap: 8, zIndex: 100 }}>
        {(["en", "it"] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: "8px 16px", borderRadius: 20,
            border: `1px solid ${lang === l ? "#b45309" : "#27272a"}`,
            background: lang === l ? "rgba(180,83,9,0.12)" : "rgba(0,0,0,0.6)",
            color: lang === l ? "#f59e0b" : "#52525b",
            fontFamily: "system-ui", fontSize: 12,
            fontWeight: lang === l ? 600 : 400,
            cursor: "pointer", letterSpacing: "0.1em",
            textTransform: "uppercase", backdropFilter: "blur(8px)",
          }}>
            {l === "en" ? "🇬🇧 EN" : "🇮🇹 IT"}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{
          textAlign: "center", marginBottom: 64,
          paddingBottom: 48, borderBottom: "1px solid #1c1c1c",
          transition: "opacity 0.6s ease",
          opacity: dimmed ? 0.1 : 1,
        }}>
          <p style={{ fontSize: 12, letterSpacing: "0.35em", color: "#b45309", textTransform: "uppercase", fontFamily: "system-ui", margin: "0 0 20px" }}>
            {t.service}
          </p>
          <h1 style={{ margin: 0, lineHeight: 1.05 }}>
            <span style={{ display: "block", fontSize: "clamp(44px, 7vw, 96px)", fontWeight: "bold", color: "white" }}>
              {t.title[0]}
            </span>
            <span style={{ display: "block", fontSize: "clamp(36px, 5.5vw, 68px)", fontWeight: "bold", background: "linear-gradient(135deg, #f59e0b 0%, #dc2626 50%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {t.title[1]}
            </span>
          </h1>
          <p style={{ color: "#71717a", fontFamily: "system-ui", fontSize: "clamp(15px, 1.8vw, 22px)", maxWidth: 480, margin: "24px auto 0", lineHeight: 1.9 }}>
            {t.subtitle.split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>
          <div style={{ width: 64, height: 1, background: "#b45309", opacity: 0.3, margin: "36px auto 0" }} />
        </div>

        {/* Movie Slots */}
        <div style={{ marginBottom: 48, transition: "opacity 0.6s ease", opacity: dimmed ? 0.1 : 1 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.25em", color: "#52525b", marginBottom: 24, textTransform: "uppercase", fontFamily: "system-ui", marginTop: 0 }}>
            {t.watchlist} ({selectedMovies.length}/{movies.length})
          </p>
          <div className="movie-grid">
            {movies.map((movie, i) => (
              <MovieSlot key={i} index={i} movie={movie} onSelect={(m) => handleSelect(i, m)} onRemove={() => handleRemove(i)} />
            ))}
            {canAddSlot && (
              <button onClick={addSlot} style={{
                width: "clamp(130px, 18vw, 180px)", aspectRatio: "2/3",
                borderRadius: 10, border: "1px dashed #2a2a2a",
                background: "transparent", color: "#3f3f46",
                cursor: "pointer", display: "flex",
                flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 8,
                fontFamily: "system-ui", fontSize: 14,
              }}>
                <span style={{ fontSize: 24 }}>+</span>
                <span>{lang === "it" ? "Aggiungi" : "Add film"}</span>
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ transition: "opacity 0.6s ease", opacity: dimmed ? 0.1 : 1 }}>
          <button
            onClick={handleRoast}
            disabled={!canRoast}
            className={canRoast ? "shimmer-btn" : ""}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              width: "100%", padding: "22px", borderRadius: 12, border: "none",
              background: canRoast ? "#f59e0b" : "#111",
              color: canRoast ? "#000" : "#3f3f46",
              cursor: canRoast ? "pointer" : "not-allowed",
              fontFamily: "system-ui", fontSize: 16, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
            }}
          >
            {streaming ? t.writing : t.submit}
          </button>
          {!canRoast && !streaming && (
            <p style={{ textAlign: "center", fontSize: 14, color: "#2a2a2a", marginTop: 12, fontFamily: "system-ui" }}>
              {t.hint}
            </p>
          )}
        </div>

        {error && (
          <p style={{ textAlign: "center", fontSize: 15, color: "#f87171", marginTop: 16, fontFamily: "system-ui" }}>
            {error}
          </p>
        )}

        <RoastReceipt text={roastText} streaming={streaming} lang={lang} criticName={CRITIC_NAMES[intensity]} />
        <SuggestionCard text={suggestions} lang={lang} />

        {roastText && !streaming && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button
              onClick={() => { setRoastText(""); setSuggestions(""); setMovies(Array(3).fill(null)); setDimmed(false); }}
              style={{ background: "none", border: "none", color: "#3f3f46", cursor: "pointer", fontSize: 14, textDecoration: "underline", fontFamily: "system-ui" }}
            >
              {t.restart}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
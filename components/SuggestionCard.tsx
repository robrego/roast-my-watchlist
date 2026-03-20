"use client";

import { useEffect, useState } from "react";
import { getPosterUrl } from "@/lib/tmdb";

interface Suggestion {
  title: string;
  year: string;
  reason: string;
  poster?: string | null;
  tmdbId?: number;
}

interface Props {
  text: string;
  lang?: "en" | "it";
}

function parseSuggestions(text: string): Suggestion[] {
  const lines = text.split("\n").filter(l => /^\d\./.test(l.trim()));
  return lines.map(line => {
    const match = line.match(/^\d\.\s+(.+?)\s+\((\d{4})\)\s+[—–-]\s+(.+)$/);
    if (!match) return null;
    return { title: match[1], year: match[2], reason: match[3], poster: null };
  }).filter(Boolean) as Suggestion[];
}


export default function SuggestionCard({ text, lang = "en" }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bmcHovered, setBmcHovered] = useState(false);

  useEffect(() => {
    if (!text) return;
    const parsed = parseSuggestions(text);
    setSuggestions(parsed);
    parsed.forEach(async (s, i) => {
      try {
        const res = await fetch(`/api/tmdb?query=${encodeURIComponent(s.title)}`);
        const data = await res.json();
        if (data[0]) {
          setSuggestions(prev => prev.map((item, idx) =>
            idx === i ? { ...item, poster: data[0].poster_path, tmdbId: data[0].id } : item
          ));
        }
      } catch {}
    });
  }, [text]);

  if (!suggestions.length) return null;

  const linkFor = (s: Suggestion) =>
    s.tmdbId
      ? `https://www.themoviedb.org/movie/${s.tmdbId}`
      : `https://www.google.com/search?q=${encodeURIComponent(s.title + " " + s.year + " film")}`;

  return (
    <>
      <style>{`
        .suggestion-wrapper {
          margin-top: 24px;
          background: #0e0e0e;
          border: 1px solid #1c1c1c;
          border-radius: 20px;
          padding: 40px 48px;
        }
        .suggestion-item {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }
        .suggestion-reason {
          font-family: 'Playfair Display', 'Palatino Linotype', Georgia, serif;
          font-size: 17px;
          color: #a1a1aa;
          line-height: 1.9;
          margin: 10px 0 0;
        }
        
        .bmc-block {
          margin-top: 48px;
          padding-top: 40px;
          border-top: 1px solid #1c1c1c;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .bmc-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          border-radius: 10px;
          background: #FFDD00;
          color: #000;
          font-family: system-ui;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.04em;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 20px rgba(255,221,0,0.2);
        }
        .bmc-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255,221,0,0.35);
        }
        @media (max-width: 768px) {
          .suggestion-wrapper {
            background: transparent;
            border: none;
            padding: 24px 0;
            border-top: 1px solid #1c1c1c;
          }
          .suggestion-item {
            gap: 16px;
          }
          .suggestion-reason {
            font-size: 14px;
            line-height: 1.7;
          }
        }
      `}</style>

      <div className="suggestion-wrapper">

        {/* Section label */}
        <p style={{
          fontSize: 13, letterSpacing: "0.25em", color: "#b45309",
          textTransform: "uppercase", fontFamily: "system-ui",
          marginBottom: 32, marginTop: 0,
        }}>
          {lang === "it" ? "Il Critico Raccomanda a Malincuore" : "The Critic Reluctantly Recommends"}
        </p>

        {/* Suggestion list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {suggestions.map((s, i) => (
            <div key={i} className="suggestion-item">

              {/* Poster */}
              <a href={linkFor(s)} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                {s.poster ? (
                  <img
                    src={getPosterUrl(s.poster)}
                    alt={s.title}
                    style={{ width: 80, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #27272a", display: "block", transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  />
                ) : (
                  <div style={{ width: 80, height: 120, background: "#18181b", borderRadius: 8, border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 24 }}>🎬</span>
                  </div>
                )}
              </a>

              {/* Info */}
              <div style={{ paddingTop: 4, minWidth: 0, flex: 1 }}>
                <a href={linkFor(s)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <p
                    style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white", fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.3, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f59e0b")}
                    onMouseLeave={e => (e.currentTarget.style.color = "white")}
                  >
                    {s.title} <span style={{ color: "#52525b", fontWeight: 400, fontSize: 14 }}>({s.year})</span>
                  </p>
                </a>
                <p className="suggestion-reason">{s.reason}</p>

                
              </div>

            </div>
          ))}
        </div>

        {/* Buy Me a Coffee */}
        <div className="bmc-block">
          <p style={{
            margin: 0,
            fontSize: 13,
            color: "#52525b",
            fontFamily: "system-ui",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {lang === "it"
              ? "Il critico lavora gratis. Per ora."
              : "The critic works for free. For now."}
          </p>
          <a
            href="https://buymeacoffee.com/robre"
            target="_blank"
            rel="noopener noreferrer"
            className="bmc-btn"
          >
            ☕ {lang === "it" ? "Offri un caffè al critico" : "Buy the critic a coffee"}
          </a>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: "#3f3f46",
            fontFamily: "system-ui",
            maxWidth: 320,
            lineHeight: 1.7,
          }}>
            {lang === "it"
              ? "Se il verdetto ti ha fatto ridere (o piangere), sai cosa fare."
              : "If the verdict made you laugh, question your taste, or both — you know what to do."}
          </p>
        </div>

      </div>
    </>
  );
}

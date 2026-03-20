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

const PLACEHOLDERS = [
  "e.g. Inception, 2010...",
  "e.g. The Godfather...",
  "e.g. Hereditary...",
  "e.g. 2001: A Space Odyssey...",
  "e.g. Parasite...",
];

export default function MovieSlot({ index, movie, onSelect, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    const res = await fetch(`/api/tmdb?id=${m.id}`);
    const full = await res.json();
    onSelect(full);
  }

  if (movie) {
    return (
      <div
      className="movie-slot"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "#18181b" }}>
          {movie.poster_path ? (
            <img
              src={getPosterUrl(movie.poster_path)}
              alt={movie.title}
              style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.05)" : "scale(1)" }}
            />
          ) : (
            <div style={{ width: "100%", aspectRatio: "2/3", display: "flex", alignItems: "center", justifyContent: "center", background: "#27272a", color: "#71717a", fontSize: 13, textAlign: "center", padding: 8 }}>
              {movie.title}
            </div>
          )}

          {/* Hover overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "12px 10px",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "white", fontFamily: "system-ui", lineHeight: 1.3 }}>{movie.title}</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f59e0b", fontFamily: "system-ui" }}>{movie.release_date?.split("-")[0]}</p>
          </div>

          <button
            onClick={onRemove}
            style={{
              position: "absolute", top: 6, right: 6,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(0,0,0,0.85)", color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer", fontSize: 14, fontWeight: "bold",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 1,
              zIndex: 10,
            }}
          >✕</button>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: "#71717a", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "system-ui" }}>{movie.title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3f3f46", textAlign: "center", fontFamily: "system-ui" }}>{movie.release_date?.split("-")[0]}</p>
      </div>
    );
  }

  return (
    <div className="movie-slot">
      <div style={{
        width: "100%", aspectRatio: "2/3",
        borderRadius: 10, border: "1px dashed #2a2a2a",
        background: "rgba(24,24,27,0.3)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span style={{ color: "#3f3f46", fontSize: 24 }}>+</span>
        <span style={{ color: "#3f3f46", fontSize: 12, fontFamily: "system-ui" }}>Film {index + 1}</span>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={PLACEHOLDERS[index % PLACEHOLDERS.length]}
        style={{
          marginTop: 10, width: "100%", background: "#18181b",
          border: "1px solid #3f3f46", borderRadius: 8,
          padding: "16px 18px", fontSize: 16, color: "white",
          fontFamily: "system-ui", outline: "none", boxSizing: "border-box",
          lineHeight: 1.6,
        }}
      />
      {open && results.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", marginTop: 4, left: 0,
          width: "min(260px, 90vw)", zIndex: 1000, background: "#18181b",
          border: "1px solid #3f3f46", borderRadius: 10,
          overflow: "hidden", listStyle: "none", padding: 0, margin: 0,
          boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        }}>
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => handleSelect(r)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #27272a" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#27272a")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {r.poster_path && (
                <img src={getPosterUrl(r.poster_path)} alt="" style={{ width: 32, height: 48, objectFit: "cover", borderRadius: 4 }} />
              )}
              <div>
                <p style={{ margin: 0, fontSize: 14, color: "white", fontWeight: 500, fontFamily: "system-ui" }}>{r.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#71717a", fontFamily: "system-ui" }}>{r.release_date?.split("-")[0]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loading && <p style={{ position: "absolute", top: "100%", marginTop: 4, fontSize: 12, color: "#71717a", fontFamily: "system-ui" }}>Searching...</p>}
    </div>
  );
}
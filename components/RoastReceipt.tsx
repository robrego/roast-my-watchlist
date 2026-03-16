"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  streaming: boolean;
  lang?: "en" | "it";
  criticName?: string;
}

export default function RoastReceipt({ text, streaming, lang = "en", criticName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showCritic, setShowCritic] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if ((text || streaming) && !showCritic) {
      setShowCritic(true);
      setTimeout(() => setShowReceipt(true), criticName ? 2200 : 0);
    }
  }, [text, streaming]);

  useEffect(() => {
    if (showReceipt) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [text, showReceipt]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleScreenshot() {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#0e0e0e",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = "my-roast.png";
      link.href = canvas.toDataURL();
      link.click();
    } catch {
      handleCopy();
    }
  }

  if (!text && !streaming) return null;

  const lines = text.split("\n");
  const signoffIndex = lines.findIndex(l => {
    const trimmed = l.trim();
    return (
      trimmed.startsWith("With diminishing hope") ||
      trimmed.startsWith("Con speranza") ||
      trimmed.startsWith("Logged.") ||
      trimmed.startsWith("Registrato.") ||
      trimmed.startsWith("Yours in mourning") ||
      trimmed.startsWith("Nel lutto") ||
      trimmed.startsWith("Prof. E. Marsh") ||
      trimmed.startsWith("J-P. Renaud")
    );
  });
  const bodyText = signoffIndex > 0 ? lines.slice(0, signoffIndex).join("\n").trim() : text;
  const signoffText = signoffIndex > 0 ? lines.slice(signoffIndex).join("\n").trim() : "";

  return (
    <div style={{ marginTop: 40 }}>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .critic-reveal { animation: fadeInDown 0.6s ease-out forwards; }
        .receipt-appear { animation: fadeInUp 0.8s ease-out forwards; }
        .receipt-card {
          background: rgba(14,14,14,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 48px 56px;
        }
        @media (max-width: 768px) {
          .receipt-card {
            background: transparent !important;
            backdrop-filter: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .receipt-header { display: none !important; }
          .receipt-sprockets { display: none !important; }
        }
      `}</style>

      {/* Critic title card */}
      {showCritic && criticName && !showReceipt && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.9)",
          zIndex: 1000,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)",
        }}>
          <div className="critic-reveal" style={{ textAlign: "center", padding: "0 32px" }}>
            <p style={{ fontSize: 12, letterSpacing: "0.4em", color: "#b45309", textTransform: "uppercase", fontFamily: "system-ui", marginBottom: 20 }}>
              {lang === "it" ? "Il tuo giudice di stasera è..." : "Tonight your judge is..."}
            </p>
            <p style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: "bold", color: "white", fontFamily: "'Playfair Display', Georgia, serif", margin: 0, lineHeight: 1.2 }}>
              {criticName}
            </p>
            <div style={{ width: 64, height: 1, background: "#b45309", margin: "24px auto" }} />
            <p style={{ fontSize: 14, color: "#52525b", fontFamily: "system-ui" }}>
              {lang === "it" ? "Preparati." : "Brace yourself."}
            </p>
          </div>
        </div>
      )}

      {showReceipt && (
        <div className="receipt-appear">
          <div ref={receiptRef} className="receipt-card">

            {/* Sprocket holes top */}
            <div className="receipt-sprockets" style={{ display: "flex", justifyContent: "space-between", marginBottom: 28, opacity: 0.1 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#888" }} />
              ))}
            </div>

            {/* Header */}
            <div className="receipt-header" style={{ textAlign: "center", marginBottom: 32, paddingBottom: 20, borderBottom: "1px dashed #2a2a2a" }}>
              <p style={{ fontSize: 12, letterSpacing: "0.3em", color: "#71717a", fontFamily: "system-ui", textTransform: "uppercase", margin: 0 }}>
                {lang === "it" ? "La Camera Oscura del Critico" : "The Critic's Darkroom"}
              </p>
              <p style={{ fontSize: 12, color: "#3f3f46", fontFamily: "system-ui", margin: "6px 0 0" }}>
                {lang === "it" ? "— Verdetto Ufficiale —" : "— Official Verdict —"}
              </p>
            </div>

            {/* Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {bodyText.split(/\n+/).filter(p => p.trim()).map((paragraph, i, arr) => (
                <p key={i} style={{
                  fontFamily: "'Playfair Display', 'Palatino Linotype', Georgia, serif",
                  fontSize: "clamp(16px, 2vw, 20px)",
                  lineHeight: 2.0,
                  color: "#e4e4e7",
                  margin: 0,
                }}>
                  {paragraph.trim()}
                  {streaming && !signoffText && i === arr.length - 1 && (
                    <span style={{ animation: "blink 0.8s infinite", color: "#f59e0b" }}>▋</span>
                  )}
                </p>
              ))}
            </div>

            {/* Signoff */}
            {signoffText && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #1c1c1c", textAlign: "right" }}>
                <p style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(14px, 1.5vw, 16px)",
                  fontStyle: "italic",
                  color: "#71717a",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  lineHeight: 1.9,
                }}>
                  {signoffText}
                  {streaming && (
                    <span style={{ animation: "blink 0.8s infinite", color: "#f59e0b" }}>▋</span>
                  )}
                </p>
              </div>
            )}

            {/* Sprocket holes bottom */}
            <div className="receipt-sprockets" style={{ display: "flex", justifyContent: "space-between", marginTop: 28, opacity: 0.1 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#888" }} />
              ))}
            </div>

            <div ref={bottomRef} />
          </div>

          {/* Share buttons */}
          {!streaming && text && (
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: "12px 28px", borderRadius: 8,
                  border: "1px solid #27272a", background: "transparent",
                  color: copied ? "#22c55e" : "#a1a1aa",
                  fontFamily: "system-ui", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s",
                }}
              >
                {copied ? "✓" : "⎘"} {copied
                  ? (lang === "it" ? "Copiato!" : "Copied!")
                  : (lang === "it" ? "Copia testo" : "Copy text")}
              </button>
              <button
                onClick={handleScreenshot}
                style={{
                  padding: "12px 28px", borderRadius: 8,
                  border: "1px solid #27272a", background: "transparent",
                  color: "#a1a1aa", fontFamily: "system-ui", fontSize: 14,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                ↓ {lang === "it" ? "Salva immagine" : "Save as image"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
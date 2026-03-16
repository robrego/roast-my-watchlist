"use client";

import { Intensity } from "@/lib/types";

interface Props {
  value: Intensity;
  onChange: (v: Intensity) => void;
}

const OPTIONS: { value: Intensity; label: string; desc: string; activeColor: string }[] = [
  { value: "mild", label: "Mild", desc: "Disappointed mentor", activeColor: "#3b82f6" },
  { value: "spicy", label: "Spicy", desc: "Letterboxd snob", activeColor: "#f97316" },
  { value: "brutal", label: "Brutal", desc: "Cahiers du Cinéma", activeColor: "#ef4444" },
];

export default function IntensityPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 8,
            border: `1px solid ${value === opt.value ? opt.activeColor : "#3f3f46"}`,
            background: value === opt.value ? "rgba(255,255,255,0.05)" : "transparent",
            color: value === opt.value ? opt.activeColor : "#71717a",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, fontFamily: "system-ui" }}>{opt.label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.7, fontFamily: "system-ui" }}>{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}
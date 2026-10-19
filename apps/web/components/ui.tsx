"use client";
import { statusLabels, statusColors } from "../lib/mockData";

export const Card = ({ children, style, hover, padding = 16, ...rest }: any) => (
  <div className={`card ${hover ? "card-hover" : ""}`} style={{ padding, ...style }} {...rest}>{children}</div>
);

export const Badge = ({ status, dot }: { status: string; dot?: boolean }) => {
  const color = statusColors[status] || "#64748b";
  return (
    <span style={{
      background: `${color}14`, color, border: `1px solid ${color}28`,
      padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
    }}>
      {dot && <span className="dot" style={{ background: color, boxShadow: `0 0 0 4px ${color}18` }} />}
      {statusLabels[status] || status}
    </span>
  );
};

export const Avatar = ({ name, size = 36, src }: { name: string; size?: number; src?: string }) => {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").slice(0, 2);
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return src ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0" }} /> :
    <div style={{ width: size, height: size, borderRadius: 10, background: `linear-gradient(135deg,hsl(${hue} 70% 42%),hsl(${(hue + 40) % 360} 70% 44%))`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: size * 0.38, border: "1px solid rgba(255,255,255,.5)", boxShadow: "0 2px 8px rgba(15,23,42,.12)" }}>{initials}</div>;
};

export const Pill = ({ active, children, onClick, icon }: any) => (
  <button onClick={onClick} style={{
    padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? "#0f172a" : "#fff", color: active ? "#fff" : "#475569", border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
    boxShadow: active ? "0 4px 10px rgba(15,23,42,.12)" : "0 1px 2px rgba(15,23,42,.05)", transition: ".14s"
  }}>{icon}{children}</button>
);

export const SectionTitle = ({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
    <div><div style={{ fontSize: 15, fontWeight: 900, letterSpacing: .1 }}>{title}</div>{desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{desc}</div>}</div>
    {action}
  </div>
);

export const Empty = ({ icon = "📭", title, desc, action }: any) => (
  <div style={{ padding: 28, textAlign: "center", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 16 }}>
    <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", placeItems: "center", margin: "0 auto", fontSize: 22 }}>{icon}</div>
    <div style={{ fontWeight: 800, marginTop: 10 }}>{title}</div>
    {desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 420, marginInline: "auto" }}>{desc}</div>}
    {action && <div style={{ marginTop: 12 }}>{action}</div>}
  </div>
);

export const Modal = ({ open, onClose, title, children, width = 560 }: any) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} className="scale" style={{ width: "100%", maxWidth: width, background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", boxShadow: "0 24px 64px rgba(15,23,42,.22)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ fontWeight: 900, flex: 1 }}>{title}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer", display: "grid", placeItems: "center" }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
};

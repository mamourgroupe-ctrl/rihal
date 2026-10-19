"use client";
export default function TopBar({ title, subtitle, actions, crumbs }: { title: string; subtitle?: string; actions?: React.ReactNode; crumbs?: string[] }) {
  return (
    <div style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          {crumbs && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{crumbs.map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>{c} {i < crumbs.length - 1 && <span style={{ opacity: .5 }}>›</span>}</span>)}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: .1 }}>{title}</h1>
            <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>v0.1.0</span>
          </div>
          {subtitle && <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{subtitle}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "6px 8px", boxShadow: "0 1px 2px rgba(15,23,42,.06)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981", boxShadow: "0 0 0 4px rgba(16,185,129,.15)" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#065f46" }}>API متصل</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "2px 7px", borderRadius: 999 }}>4000</span>
            <span style={{ fontSize: 11, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>WEB 3000</span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: "8px 10px" }} title="إشعارات">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 8a6 6 0 0 1 12 0c0 7-6 11-6 11s-6-4-6-11"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
              <span style={{ background: "#e11d48", color: "#fff", padding: "1px 5px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>3</span>
            </button>
            <a href="/api/pilgrims" target="_blank" className="btn btn-ghost" style={{ padding: "8px 12px" }}>API</a>
            <a href="https://github.com/mamourgroupe-ctrl/rihal" target="_blank" className="btn btn-dark">GitHub ↗</a>
          </div>
        </div>
      </div>
      {actions && <div style={{ padding: "0 18px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

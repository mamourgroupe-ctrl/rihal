"use client";
import { useState } from "react";

const nav = [
  { id: "dashboard", label: "لوحة التحكم", icon: "📊" },
  { id: "pilgrims", label: "المعتمرون", icon: "🧕" },
  { id: "groups", label: "الأفواج", icon: "👥" },
  { id: "documents", label: "الوثائق", icon: "📄" },
  { id: "invoices", label: "الفوترة", icon: "💳" },
];

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside style={{
      width: collapsed ? 72 : 260, background: "#0f172a", color: "#e2e8f0",
      display: "flex", flexDirection: "column", transition: "width .2s", flexShrink: 0,
      minHeight: "100vh", position: "sticky", top: 0,
    }}>
      <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0f766e,#0ea5e9)", display: "grid", placeItems: "center", fontSize: 20 }}>🕌</div>
        {!collapsed && <div><div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>رحال | Rihal</div><div style={{ fontSize: 11, color: "#94a3b8" }}>وكالة النور للحج والعمرة</div></div>}
        <button onClick={() => setCollapsed(!collapsed)} style={{ marginInlineStart: "auto", background: "rgba(255,255,255,.08)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer" }}>{collapsed ? "→" : "←"}</button>
      </div>

      <nav style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(i => (
          <button key={i.id} onClick={() => onChange(i.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: active === i.id ? 700 : 500,
              background: active === i.id ? "rgba(15,118,110,.2)" : "transparent",
              color: active === i.id ? "#5eead4" : "#cbd5e1", textAlign: "right", width: "100%",
              borderInlineStart: active === i.id ? "3px solid #0f766e" : "3px solid transparent",
            }}>
            <span style={{ fontSize: 18 }}>{i.icon}</span>{!collapsed && i.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        {!collapsed && <div style={{ background: "rgba(15,118,110,.12)", border: "1px solid rgba(15,118,110,.2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#5eead4", marginBottom: 4 }}>الخطة الحالية: PRO</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>45 / 100 معتمر هذا الموسم</div>
          <div style={{ height: 4, background: "rgba(255,255,255,.1)", borderRadius: 999, marginTop: 8, overflow: "hidden" }}><div style={{ width: "45%", height: "100%", background: "#0f766e" }} /></div>
        </div>}
        {!collapsed && <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "8px 0" }}>
          <img src="https://i.pravatar.cc/100?img=12" alt="" style={{ width: 36, height: 36, borderRadius: 999, border: "2px solid rgba(255,255,255,.1)" }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>أحمد مامور</div><div style={{ fontSize: 11, color: "#94a3b8" }}>admin@rihal.dz</div></div>
          <span style={{ fontSize: 12 }}>⚙️</span>
        </div>}
      </div>
    </aside>
  );
}

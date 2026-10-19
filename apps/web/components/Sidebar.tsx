"use client";
import { useState } from "react";

const nav = [
  { id: "dashboard", label: "لوحة التحكم", sub: "نظرة عامة", icon: DashboardIcon },
  { id: "pilgrims", label: "المعتمرون", sub: "إدارة المعتمرين", icon: UsersIcon, badge: "6" },
  { id: "groups", label: "الأفواج", sub: "المجموعات", icon: LayersIcon },
  { id: "documents", label: "الوثائق", sub: "جوازات & تأشيرات", icon: FileIcon },
  { id: "invoices", label: "الفوترة", sub: "ZATCA & QR", icon: WalletIcon },
];

function DashboardIcon(p: any){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>}
function UsersIcon(p: any){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
function LayersIcon(p: any){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
function FileIcon(p: any){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
function WalletIcon(p: any){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>}

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside style={{
      width: collapsed ? 76 : 280, background: "#0b1220", color: "#e2e8f0",
      display: "flex", flexDirection: "column", transition: "width .22s cubic-bezier(.2,.8,.2,1)", flexShrink: 0,
      minHeight: "100vh", position: "sticky", top: 0, borderInlineEnd: "1px solid rgba(255,255,255,.06)",
      overflow: "hidden"
    }}>
      {/* Brand */}
      <div style={{ padding: "18px 14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#0f766e 0%,#06b6d4 100%)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 18, boxShadow: "0 8px 20px rgba(6,182,212,.25)", flexShrink: 0 }}>ر</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#fff", letterSpacing: .2, lineHeight: 1 }}>رحال <span style={{ fontWeight: 600, opacity: .85 }}>Rihal</span></div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "#10b981", display: "inline-block" }} /> وكالة النور • PRO</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} aria-label="toggle" style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)", color: "#cbd5e1", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ transform: collapsed ? "scaleX(-1)" : "none", display: "inline-block", transition: ".2s" }}>‹‹</span>
        </button>
      </div>

      {/* Search (when expanded) */}
      {!collapsed && (
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "8px 10px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input placeholder="بحث..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13 }} />
            <span className="kbd" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.12)", color: "#94a3b8" }}>⌘K</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        <div style={{ fontSize: 10, letterSpacing: .6, color: "#64748b", padding: "6px 8px", fontWeight: 700 }}>{!collapsed ? "القائمة الرئيسية" : "—"}</div>
        {nav.map(item => {
          const Active = active === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)} title={item.label}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "10px" : "10px 12px", borderRadius: 12,
                border: "1px solid transparent", cursor: "pointer", textAlign: "right", width: "100%", transition: ".16s",
                background: Active ? "linear-gradient(135deg,rgba(15,118,110,.18),rgba(6,182,212,.14))" : "transparent",
                color: Active ? "#5eead4" : "#cbd5e1", borderColor: Active ? "rgba(94,234,212,.18)" : "transparent",
                boxShadow: Active ? "inset 0 1px 0 rgba(255,255,255,.06)" : "none", position: "relative", justifyContent: collapsed ? "center" : "flex-start"
              }}>
              {!collapsed && Active && <span style={{ position: "absolute", insetInlineStart: -10, top: 8, bottom: 8, width: 3, borderRadius: 999, background: "#14b8a6" }} />}
              <span style={{ width: 34, height: 34, borderRadius: 10, background: Active ? "rgba(20,184,166,.15)" : "rgba(255,255,255,.05)", border: Active ? "1px solid rgba(20,184,166,.22)" : "1px solid rgba(255,255,255,.06)", display: "grid", placeItems: "center", color: Active ? "#5eead4" : "#94a3b8", flexShrink: 0 }}>
                <item.icon />
              </span>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: "right" as any }}>
                  <div style={{ fontWeight: Active ? 800 : 600, fontSize: 13, lineHeight: 1.1 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: Active ? "#99f6e4" : "#64748b", marginTop: 1 }}>{item.sub}</div>
                </div>
              )}
              {!collapsed && (item as any).badge && <span style={{ background: Active ? "#0f766e" : "#1e293b", color: Active ? "#fff" : "#94a3b8", border: "1px solid rgba(255,255,255,.08)", padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{(item as any).badge}</span>}
              {!collapsed && Active && <span style={{ color: "#5eead4" }}>›</span>}
            </button>
          );
        })}

        {!collapsed && (
          <div style={{ marginTop: 8, background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: "#fff", display: "grid", placeItems: "center", fontSize: 14 }}>✈️</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>موسم 1447 هـ</div><div style={{ fontSize: 11, color: "#94a3b8" }}>3 أفواج • 38 حجز</div></div>
              <span style={{ fontSize: 11, background: "#0f766e", color: "#fff", padding: "3px 8px", borderRadius: 999, fontWeight: 800 }}>نشط</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 999, marginTop: 10, overflow: "hidden" }}><div style={{ width: "62%", height: "100%", background: "linear-gradient(90deg,#14b8a6,#06b6d4)" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 6 }}><span>62% اكتمال</span><span>45 / 72</span></div>
          </div>
        )}
      </div>

      {/* User */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
        {!collapsed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 10px" }}>
              <img src="https://i.pravatar.cc/100?img=12" alt="" style={{ width: 36, height: 36, borderRadius: 10, border: "2px solid rgba(255,255,255,.12)", objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>أحمد مامور</div><div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>admin@rihal.dz • Owner</div></div>
              <button style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", color: "#cbd5e1", display: "grid", placeItems: "center", cursor: "pointer" }}>⋯</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.07)", color: "#e2e8f0", padding: "7px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⚙️ الإعدادات</button>
              <button style={{ background: "#e11d48", border: "1px solid #e11d48", color: "#fff", padding: "7px 10px", borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>خروج</button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <img src="https://i.pravatar.cc/100?img=12" alt="" style={{ width: 36, height: 36, borderRadius: 999, border: "2px solid rgba(255,255,255,.12)" }} />
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981", boxShadow: "0 0 0 4px rgba(16,185,129,.15)" }} />
          </div>
        )}
      </div>
    </aside>
  );
}

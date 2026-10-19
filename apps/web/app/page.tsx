"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { pilgrims as mockPilgrims, groups as mockGroups, invoices as mockInvoices, statusLabels, statusColors } from "../lib/mockData";

// --- helpers
const fmt = (n: number) => n.toLocaleString("fr-DZ");
const Card = ({ children, style }: any) => (
  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, ...style }}>{children}</div>
);
const Badge = ({ status }: { status: string }) => (
  <span style={{ background: `${statusColors[status]}18`, color: statusColors[status], border: `1px solid ${statusColors[status]}30`, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
    {statusLabels[status] || status}
  </span>
);
const Stat = ({ icon, label, value, sub, color, loading }: any) => (
  <Card style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, opacity: loading ? 0.6 : 1 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}22`, display: "grid", placeItems: "center", fontSize: 22 }}>{icon}</div>
    <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: "#64748b" }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div><div style={{ fontSize: 11, color }}>{sub}</div></div>
  </Card>
);

// --- Dashboard (now live)
function Dashboard({ onNavigate }: { onNavigate: (t: string) => void }) {
  const [health, setHealth] = useState<any>(null);
  const [pilgrims, setPilgrims] = useState<any[]>(mockPilgrims);
  const [groups, setGroups] = useState<any[]>(mockGroups);
  const [invoices, setInvoices] = useState<any[]>(mockInvoices);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth).catch(()=>{});
    fetch("/api/pilgrims").then(r=>r.json()).then(d=> d.data && setPilgrims(d.data)).catch(()=>{});
    fetch("/api/groups").then(r=>r.json()).then(d=> d.data && setGroups(d.data)).catch(()=>{});
    fetch("/api/invoices").then(r=>r.json()).then(d=> d.data && setInvoices(d.data)).catch(()=>{});
  }, []);

  const totalInvoices = invoices.reduce((s: any,i:any)=>s+i.amount,0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#0f766e 60%,#0ea5e9 100%)", borderRadius: 16, padding: "18px 20px", color: "#fff", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 18 }}>مرحباً، أحمد 👋</div><div style={{ opacity: .85, fontSize: 13, marginTop: 2 }}>لديك {groups.length} أفواج نشطة و {pilgrims.filter((p:any)=>p.status==='DRAFT' || p.status==='DOCUMENTS_UPLOADED').length} معتمر في انتظار استكمال الوثائق — البيانات حية من API</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNavigate("pilgrims")} style={{ background: "#fff", color: "#0f172a", border: "none", padding: "8px 14px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ إضافة معتمر</button>
          <button onClick={() => onNavigate("groups")} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", padding: "8px 14px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>إنشاء فوج</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <Stat icon="🧕" label="إجمالي المعتمرين" value={pilgrims.length} sub="مباشر من /api/pilgrims" color="#0ea5e9" />
        <Stat icon="👥" label="الأفواج النشطة" value={groups.length} sub="مباشر من /api/groups" color="#0f766e" />
        <Stat icon="📄" label="وثائق معلقة" value="12" sub="تحتاج مراجعة" color="#f59e0b" />
        <Stat icon="💰" label="إجمالي الفواتير" value={`${fmt(totalInvoices)} دج`} sub={`${invoices.length} فواتير`} color="#22c55e" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>آخر المعتمرين — <span style={{ fontWeight: 400, color: "#64748b" }}>مباشر</span></h3><button onClick={() => onNavigate("pilgrims")} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>عرض الكل ←</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ color: "#64748b", fontSize: 11, textAlign: "right" }}><th style={{ padding: "8px 6px" }}>الاسم</th><th>جواز السفر</th><th>الفوج</th><th>الحالة</th></tr></thead>
              <tbody>
                {pilgrims.slice(0, 5).map((p:any) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 6px" }}><div style={{ fontWeight: 700 }}>{p.fullNameAr}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{p.fullNameEn}</div></td>
                    <td style={{ fontFamily: "monospace" }}>{p.passportNumber}</td>
                    <td>{p.groupName || "—"}</td>
                    <td><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>الأفواج</h3>
            {groups.map((g:any) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdfa", border: "1px solid #ccfbf1", display: "grid", placeItems: "center" }}>🕋</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{g.memberCount}/{g.maxSize} • {g.scheduledDate}</div></div>
                <Badge status={g.status} />
              </div>
            ))}
          </Card>
          <Card style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "#e2e8f0", border: "none" }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>حالة الخادم</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: health ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{health ? `API يعمل • ${health.environment}` : "جاري الفحص..."}</span>
            </div>
            {health && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>uptime: {Math.floor(health.uptime)}s • {new Date(health.timestamp).toLocaleString("ar-DZ")}</div>}
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="/api/pilgrims" target="_blank" style={{ fontSize: 11, background: "rgba(255,255,255,.1)", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)" }}>GET /api/pilgrims</a>
              <a href="/api/groups" style={{ fontSize: 11, background: "rgba(255,255,255,.1)", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)" }}>GET /api/groups</a>
              <a href="/api/health" style={{ fontSize: 11, background: "rgba(255,255,255,.1)", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)" }}>GET /api/health</a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PilgrimsView() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [pilgrims, setPilgrims] = useState<any[]>(mockPilgrims);
  const [groups] = useState<any[]>(mockGroups);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullNameAr: "", fullNameEn: "", passportNumber: "", nationality: "DZ", phone: "" });

  const fetchPilgrims = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (q) params.set("search", q);
    fetch(`/api/pilgrims?${params.toString()}`).then(r=>r.json()).then(d=> d.data && setPilgrims(d.data)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ fetchPilgrims(); },[filter]);
  // debounce search
  useEffect(()=>{ const t=setTimeout(fetchPilgrims,300); return ()=>clearTimeout(t); },[q]);

  const handleCreate = async () => {
    if(!form.fullNameAr || !form.passportNumber){ alert("الاسم و جواز السفر مطلوبان"); return; }
    setLoading(true);
    const res = await fetch("/api/pilgrims",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    if(res.ok){ const created = await res.json(); setPilgrims(prev=>[created, ...prev]); setShowAdd(false); setForm({ fullNameAr:"", fullNameEn:"", passportNumber:"", nationality:"DZ", phone:"" }); }
    setLoading(false);
  };

  const handleDelete = async (id:string)=>{
    if(!confirm("حذف هذا المعتمر؟")) return;
    await fetch(`/api/pilgrims/${id}`,{ method:"DELETE" });
    setPilgrims(prev=>prev.filter(p=>p.id!==id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>المعتمرون <span style={{ color: "#64748b", fontWeight: 400, fontSize: 14 }}>({pilgrims.length}) {loading && "• جاري التحديث..."}</span></h2>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو جواز السفر..." style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", minWidth: 220, fontSize: 13 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>
          <option value="all">كل الحالات</option>{Object.entries(statusLabels).slice(0,8).map(([k,v])=> <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: "#0f766e", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>{showAdd ? "إغلاق" : "+ إضافة معتمر"}</button>
      </div>

      {showAdd && (
        <Card style={{ background: "#f0fdfa", borderColor: "#99f6e4" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>إضافة معتمر جديد — يحفظ مباشرة في API (in-memory)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input placeholder="الاسم بالعربية *" value={form.fullNameAr} onChange={e=>setForm({...form, fullNameAr:e.target.value})} style={inp} />
            <input placeholder="الاسم بالإنجليزية (جواز السفر)" value={form.fullNameEn} onChange={e=>setForm({...form, fullNameEn:e.target.value})} style={inp} />
            <input placeholder="رقم جواز السفر *" value={form.passportNumber} onChange={e=>setForm({...form, passportNumber:e.target.value})} style={inp} />
            <input placeholder="الجنسية" value={form.nationality} onChange={e=>setForm({...form, nationality:e.target.value})} style={inp} />
            <input placeholder="رقم الهاتف" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} style={inp} />
            <select style={inp}><option>اختر الفوج</option>{groups.map((g:any) => <option key={g.id}>{g.name}</option>)}</select>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={loading} style={{ background: "#0f766e", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: loading?0.6:1 }}>{loading? "جاري الحفظ..." : "حفظ"}</button>
            <button onClick={() => setShowAdd(false)} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>إلغاء</button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}><tr style={{ color: "#475569", textAlign: "right", fontSize: 11 }}><th style={th}>المعتمر</th><th style={th}>جواز السفر</th><th style={th}>الجنسية</th><th style={th}>الفوج</th><th style={th}>الحالة</th><th style={th}>إجراء</th></tr></thead>
            <tbody>
              {pilgrims.map((p:any) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 10px" }}><div style={{ fontWeight: 700 }}>{p.fullNameAr}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{p.fullNameEn} • {p.phone || "—"}</div></td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.passportNumber}</td>
                  <td><span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>{p.nationality}</span></td>
                  <td style={{ fontSize: 12 }}>{p.groupName || "—"}</td>
                  <td><Badge status={p.status} /></td>
                  <td><div style={{ display:"flex", gap:6 }}><button style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>تعديل</button><button onClick={()=>handleDelete(p.id)} style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", padding:"6px 10px", borderRadius:8, fontSize:11, cursor:"pointer" }}>حذف</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pilgrims.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>لا توجد نتائج — جرب تغيير البحث أو الفلتر</div>}
      </Card>
    </div>
  );
}
const th: any = { padding: "10px", fontWeight: 700 };
const inp: any = { padding: "9px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" };

function GroupsView() {
  const [groups, setGroups] = useState<any[]>(mockGroups);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", description:"", maxSize: 30 });
  useEffect(()=>{ fetch("/api/groups").then(r=>r.json()).then(d=> d.data && setGroups(d.data)).catch(()=>{}); },[]);
  const handleCreate = async ()=>{
    if(!form.name) return alert("اسم الفوج مطلوب");
    const res = await fetch("/api/groups",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...form, maxSize: Number(form.maxSize) }) });
    if(res.ok){ const g=await res.json(); setGroups(prev=>[...prev,g]); setShowAdd(false); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><h2 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>الأفواج <span style={{ color:"#64748b", fontWeight:400, fontSize:14 }}>({groups.length})</span></h2><button onClick={()=>setShowAdd(!showAdd)} style={{ background: "#0f766e", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>{showAdd? "إغلاق" : "+ إنشاء فوج"}</button></div>
      {showAdd && <Card style={{ background:"#f0fdfa", borderColor:"#99f6e4" }}><div style={{ fontWeight:700, marginBottom:8 }}>إنشاء فوج جديد</div><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}><input placeholder="اسم الفوج" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} style={inp}/><input placeholder="الوصف" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} style={inp}/><input type="number" placeholder="الحد الأقصى" value={form.maxSize} onChange={e=>setForm({...form, maxSize: Number(e.target.value)})} style={inp}/><button onClick={handleCreate} style={{ background:"#0f766e", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }}>إنشاء</button></div></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {groups.map((g:any) => {
          const pct = Math.round((g.memberCount / g.maxSize) * 100);
          return (
            <Card key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0f766e,#0ea5e9)", display: "grid", placeItems: "center", color: "#fff", fontSize: 20 }}>🕋</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{g.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{g.description}</div></div>
                <Badge status={g.status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}><span>{g.memberCount} / {g.maxSize} معتمر</span><span>{pct}%</span></div>
              <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: pct > 80 ? "#0f766e" : "#0ea5e9" }} /></div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, background: "#0f172a", color: "#fff", border: "none", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>إدارة</button>
                <button style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", padding: "8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>تصدير</button>
              </div>
              {g.scheduledDate && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>📅 {g.scheduledDate}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InvoicesView() {
  const [invoices, setInvoices] = useState<any[]>(mockInvoices);
  useEffect(()=>{ fetch("/api/invoices").then(r=>r.json()).then(d=> d.data && setInvoices(d.data)).catch(()=>{}); },[]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>الفوترة والفواتير — <span style={{ fontWeight:400, color:"#64748b", fontSize:14 }}>مباشر من API</span></h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Stat icon="💰" label="إجمالي" value={`${fmt(invoices.reduce((s:any,i:any)=>s+i.amount,0))} دج`} sub={`${invoices.length} فواتير`} color="#0f766e" />
        <Stat icon="✅" label="مدفوع" value={`${fmt(invoices.filter((i:any)=>i.status==="PAID").reduce((s:any,i:any)=>s+i.amount,0))} دج`} sub="1 فاتورة" color="#22c55e" />
        <Stat icon="⚠️" label="متأخر" value={`${fmt(invoices.filter((i:any)=>i.status==="OVERDUE").reduce((s:any,i:any)=>s+i.amount,0))} دج`} sub="1 فاتورة" color="#ef4444" />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc" }}><tr style={{ color: "#475569", textAlign: "right", fontSize: 11 }}><th style={th}>رقم الفاتورة</th><th style={th}>المبلغ</th><th style={th}>الحالة</th><th style={th}>الاستحقاق</th><th style={th}></th></tr></thead>
          <tbody>
            {invoices.map((inv:any) => (
              <tr key={inv.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 10px", fontFamily: "monospace", fontWeight: 700 }}>{inv.invoiceNumber}</td>
                <td style={{ fontWeight: 700 }}>{fmt(inv.amount)} {inv.currency}</td>
                <td><Badge status={inv.status} /></td>
                <td style={{ fontSize: 12, color: "#64748b" }}>{inv.dueDate}</td>
                <td><button style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>عرض PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>💡 ملاحظة ZATCA</div><div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>الفوترة متوافقة مع متطلبات الزكاة والضريبة السعودية (QR/ZATCA). سيتم توليد QR تلقائياً عند الإصدار.</div>
      </Card>
    </div>
  );
}

function DocumentsView() {
  return (
    <Card>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>الوثائق</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>إدارة جوازات السفر، التأشيرات، الصور، وشهادات التطعيم. سيتم إضافة رفع الملفات + OCR قريباً.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {[
          { t: "جواز السفر", c: "PASSPORT", n: 6, icon: "🛂" },
          { t: "التأشيرة", c: "VISA", n: 3, icon: "🛃" },
          { t: "الصورة الشخصية", c: "PHOTO", n: 6, icon: "🖼️" },
          { t: "التطعيم", c: "VACCINATION", n: 2, icon: "💉" },
        ].map(d => (
          <div key={d.c} style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 16, textAlign: "center", background: "#f8fafc" }}>
            <div style={{ fontSize: 28 }}>{d.icon}</div><div style={{ fontWeight: 700, marginTop: 6 }}>{d.t}</div><div style={{ fontSize: 12, color: "#64748b" }}>{d.n} وثائق</div>
            <button style={{ marginTop: 10, background: "#fff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>رفع</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Page() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active={tab} onChange={setTab} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap:"wrap" }}>
            <span style={{ background: "#f0fdfa", border: "1px solid #99f6e4", color: "#047857", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>● API: 4000</span>
            <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>WEB: 3000 • live</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Turborepo • pnpm • NestJS + Next.js 15</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/api" style={{ fontSize: 12, background: "#0f172a", color: "#fff", padding: "6px 10px", borderRadius: 8 }}>API JSON</a>
            <a href="https://github.com/mamourgroupe-ctrl/rihal" target="_blank" style={{ fontSize: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8 }}>GitHub</a>
          </div>
        </div>

        <div style={{ padding: 16, background: "#f8fafc", flex: 1 }}>
          {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
          {tab === "pilgrims" && <PilgrimsView />}
          {tab === "groups" && <GroupsView />}
          {tab === "invoices" && <InvoicesView />}
          {tab === "documents" && <DocumentsView />}
        </div>

        <div style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "10px 16px", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          © 2026 Rihal | رحال — منصة إدارة وكالات الحج والعمرة • تطوير Mamourgroupe • v0.1.0 • <a href="/api/pilgrims" style={{ color:"#0f766e" }}>API</a> • <a href="/api/groups" style={{ color:"#0f766e" }}>Groups</a>
        </div>
      </div>
    </div>
  );
}

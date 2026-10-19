"use client";
import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { Card, Badge, Avatar, Pill, SectionTitle, Empty, Modal } from "../components/ui";
import { pilgrims as mockPilgrims, groups as mockGroups, invoices as mockInvoices, statusLabels, statusColors } from "../lib/mockData";

// helpers
const fmt = (n: number) => n.toLocaleString("fr-DZ");
const fmtMoney = (n:number,c="دج")=> `${fmt(n)} ${c}`;

// Sparkline SVG
function Spark({ data=[3,5,4,7,6,9,8], color="#0f766e" }: { data?: number[]; color?: string }) {
  const w=80,h=24, pad=2;
  const max=Math.max(...data), min=Math.min(...data);
  const pts = data.map((v,i)=>{
    const x = pad + (i/(data.length-1))*(w-pad*2);
    const y = h - pad - ((v-min)/(max-min||1))*(h-pad*2);
    return `${x},${y}`;
  }).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:"block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.95"/><circle cx={pts.split(" ").at(-1)?.split(",")[0]} cy={pts.split(" ").at(-1)?.split(",")[1]} r="2.2" fill={color}/></svg>
}
function Ring({ pct, size=36, stroke=4, color="#0f766e" }: any){
  const r=(size-stroke)/2, c=2*Math.PI*r, off=c - (pct/100)*c;
  return (
    <div style={{ position:"relative", width:size, height:size, display:"grid", placeItems:"center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition:"stroke-dashoffset .6s ease" }}/>
      </svg>
      <span style={{ position:"absolute", fontSize:10, fontWeight:900 }}>{pct}%</span>
    </div>
  );
}

// KPI Card
function Kpi({ icon, label, value, sub, color, data, loading }: any){
  return (
    <div className="card card-hover" style={{ padding:14, display:"flex", gap:12, alignItems:"center" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:`${color}12`, border:`1px solid ${color}20`, display:"grid", placeItems:"center", color, fontSize:18 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:20, fontWeight:900, lineHeight:1, marginTop:2 }}>{loading? "—" : value}</div>
        <div style={{ fontSize:11, color:color, fontWeight:700, marginTop:2 }}>{sub}</div>
      </div>
      <div style={{ opacity:.95 }}><Spark data={data} color={color}/></div>
    </div>
  );
}

// --- Dashboard
function Dashboard({ onNavigate }: { onNavigate: (t:string)=>void }){
  const [health,setHealth]=useState<any>(null);
  const [pilgrims,setPilgrims]=useState<any[]>(mockPilgrims);
  const [groups,setGroups]=useState<any[]>(mockGroups);
  const [invoices,setInvoices]=useState<any[]>(mockInvoices);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const p1=fetch("/api/health").then(r=>r.json()).then(setHealth).catch(()=>{});
    const p2=fetch("/api/pilgrims").then(r=>r.json()).then(d=> d.data && setPilgrims(d.data)).catch(()=>{});
    const p3=fetch("/api/groups").then(r=>r.json()).then(d=> d.data && setGroups(d.data)).catch(()=>{});
    const p4=fetch("/api/invoices").then(r=>r.json()).then(d=> d.data && setInvoices(d.data)).catch(()=>{});
    Promise.all([p1,p2,p3,p4]).finally(()=>setLoading(false));
  },[]);
  const totalInvoices = invoices.reduce((s:any,i:any)=>s+i.amount,0);
  const pendingDocs = pilgrims.filter((p:any)=>["DRAFT","DOCUMENTS_UPLOADED","REGISTERED"].includes(p.status)).length;

  // Hijri rough + Gregorian
  const now = new Date();
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day:"numeric", month:"long", year:"numeric" }).format(now);
  const greg = new Intl.DateTimeFormat("ar-DZ", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(now);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }} className="fade">
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#0b1220 0%,#0f766e 55%,#0891b2 100%)", borderRadius:22, padding:"18px 18px", color:"#fff", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", position:"relative", overflow:"hidden", border:"1px solid rgba(255,255,255,.08)", boxShadow:"0 16px 36px rgba(2,6,23,.18)" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(600px 200px at 80% 10%,rgba(255,255,255,.10),transparent), radial-gradient(400px 200px at 20% 100%,rgba(20,184,166,.18),transparent)" }} />
        <div style={{ position:"relative", flex:1, minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.16)", padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:800, backdropFilter:"blur(6px)" }}>🕌 موسم 1447 هـ • عمرة رمضان</span>
            <span style={{ background:"#fff", color:"#0b1220", padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:900 }}>PRO</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.75)" }}>{hijri} • {greg}</span>
          </div>
          <div style={{ fontSize:22, fontWeight:900, marginTop:8, lineHeight:1.1 }}>أهلاً بك، أحمد 👋</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.82)", marginTop:4 }}>لديك <b style={{ color:"#fff" }}>{groups.length} أفواج نشطة</b> و <b style={{ color:"#fff" }}>{pendingDocs} معتمر</b> بانتظار استكمال الوثائق — كل البيانات حية من الـ API.</div>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <button onClick={()=>onNavigate("pilgrims")} className="btn" style={{ background:"#fff", color:"#0b1220", borderColor:"#fff", fontWeight:900 }}>+ إضافة معتمر</button>
            <button onClick={()=>onNavigate("groups")} className="btn" style={{ background:"rgba(255,255,255,.12)", color:"#fff", border:"1px solid rgba(255,255,255,.22)", backdropFilter:"blur(8px)" }}>إنشاء فوج</button>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.10)", border:"1px solid rgba(255,255,255,.14)", padding:"6px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}><span style={{ width:8, height:8, borderRadius:999, background:"#22c55e", boxShadow:"0 0 0 4px rgba(34,197,94,.22)" }}/> النظام يعمل • {health? `${Math.floor(health.uptime)}s` : "…"}</span>
          </div>
        </div>
        <div style={{ position:"relative", display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{ background:"rgba(255,255,255,.10)", border:"1px solid rgba(255,255,255,.14)", borderRadius:16, padding:12, minWidth:160, backdropFilter:"blur(10px)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.75)" }}>حجوزات هذا الأسبوع</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6 }}>
              <div style={{ fontSize:20, fontWeight:900 }}>+18</div><Spark data={[2,4,3,6,5,8,7,10]} color="#fff"/>
            </div>
            <div style={{ fontSize:11, color:"#bbf7d0", marginTop:4 }}>↑ +14% عن الأسبوع الماضي</div>
          </div>
          <div style={{ background:"#fff", color:"#0b1220", borderRadius:16, padding:12, minWidth:160, boxShadow:"0 12px 24px rgba(0,0,0,.12)" }}>
            <div style={{ fontSize:11, color:"#64748b" }}>نسبة الاكتمال</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6 }}>
              <Ring pct={62} color="#0f766e"/><div style={{ fontSize:18, fontWeight:900 }}>62%</div>
            </div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>45 / 72 معتمر</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
        <Kpi icon="🧕" label="إجمالي المعتمرين" value={loading? "…" : pilgrims.length} sub="مباشر من /api/pilgrims" color="#0ea5e9" data={[3,4,5,4,6,7,6,8]} loading={loading}/>
        <Kpi icon="👥" label="الأفواج النشطة" value={loading? "…" : groups.length} sub="2 مكتمل • 1 جاهز" color="#0f766e" data={[1,2,2,3,2,3,3,4]}/>
        <Kpi icon="📄" label="وثائق معلقة" value={pendingDocs} sub="تحتاج مراجعة" color="#d97706" data={[6,8,7,9,8,10,9,12]}/>
        <Kpi icon="💳" label="إجمالي الفواتير" value={`${fmtMoney(totalInvoices)}`} sub={`${invoices.length} فواتير • ZATCA`} color="#059669" data={[120,140,135,150,165,155,170,180]}/>
      </div>

      {/* Main grid */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.7fr) minmax(280px,.9fr)", gap:12, alignItems:"start" }}>
        {/* Pilgrims table */}
        <Card padding={0} style={{ overflow:"hidden" }}>
          <div style={{ padding:"14px 14px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
            <SectionTitle title="آخر المعتمرين" desc="مباشر من API • يتحدّث تلقائياً" />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>onNavigate("pilgrims")} className="btn btn-ghost">عرض الكل ←</button>
              <button onClick={()=>onNavigate("pilgrims")} className="btn btn-primary">+ إضافة</button>
            </div>
          </div>
          <div style={{ padding:"12px 12px 14px" }}>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:"#64748b", padding:"6px 0" }}>حالة سريعة:</span>
              {["READY_FOR_BOOKING","DOCUMENTS_UPLOADED","BOOKED","COMPLETED"].map(s=>(
                <span key={s} style={{ padding:"5px 10px", borderRadius:999, background:"#f8fafc", border:"1px solid #e2e8f0", fontSize:11, fontWeight:700, display:"inline-flex", gap:6, alignItems:"center" }}><span className="dot" style={{ background:statusColors[s] }}/>{statusLabels[s]}</span>
              ))}
            </div>
            <div style={{ border:"1px solid var(--border)", borderRadius:12, overflow:"hidden", background:"#fff" }}>
              <table className="table">
                <thead><tr><th>المعتمر</th><th>جواز السفر</th><th>الجنسية</th><th>الفوج</th><th>الحالة</th></tr></thead>
                <tbody>
                  {pilgrims.slice(0,5).map((p:any)=>(
                    <tr key={p.id}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Avatar name={p.fullNameAr} size={36}/>
                          <div><div style={{ fontWeight:800, fontSize:13 }}>{p.fullNameAr}</div><div style={{ fontSize:11, color:"#64748b" }}>{p.fullNameEn} • {p.phone||"—"}</div></div>
                        </div>
                      </td>
                      <td style={{ fontFamily:"monospace", fontWeight:700 }}>{p.passportNumber}</td>
                      <td><span style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>{p.nationality}</span></td>
                      <td><span style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", color:"#065f46", padding:"4px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>{p.groupName||"—"}</span></td>
                      <td><Badge status={p.status} dot/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card>
            <SectionTitle title="الأفواج" desc="السعة والتقدم" action={<a onClick={()=>onNavigate("groups")} style={{ fontSize:12, color:"#0f766e", fontWeight:800, cursor:"pointer" }}>إدارة ←</a>} />
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
              {groups.map((g:any)=>{
                const pct=Math.round((g.memberCount/g.maxSize)*100);
                return (
                  <div key={g.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, border:"1px solid #eef2f7", background:"#fff" }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#0f766e,#06b6d4)", display:"grid", placeItems:"center", color:"#fff", fontSize:18 }}>🕋</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{g.name}</div>
                      <div style={{ fontSize:11, color:"#64748b", display:"flex", gap:6, alignItems:"center" }}><span>{g.memberCount}/{g.maxSize}</span><span>•</span><span>{g.scheduledDate}</span></div>
                      <div className="progress" style={{ marginTop:6 }}><span style={{ width:`${pct}%`, background: pct>75?"#0f766e":pct>45?"#0ea5e9":"#f59e0b" }}/></div>
                    </div>
                    <Ring pct={pct} size={40} color={pct>75?"#0f766e":"#0ea5e9"}/>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ background:"linear-gradient(135deg,#0b1220,#131c2e)", color:"#e2e8f0", borderColor:"rgba(255,255,255,.08)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(300px 120px at 90% 0%,rgba(20,184,166,.18),transparent)" }}/>
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ width:8, height:8, borderRadius:999, background:"#22c55e", boxShadow:"0 0 0 5px rgba(34,197,94,.18)" }}/><span style={{ fontWeight:800, fontSize:13 }}>حالة النظام</span><span style={{ marginInlineStart:"auto", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", padding:"3px 8px", borderRadius:999, fontSize:11 }}>{health? health.environment : "…"}</span></div>
              {health && <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>uptime {Math.floor(health.uptime)}s • {new Date(health.timestamp).toLocaleString("ar-DZ")}</div>}
              <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                <a href="/api/pilgrims" target="_blank" style={{ fontSize:11, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", padding:"6px 10px", borderRadius:10 }}>GET /pilgrims</a>
                <a href="/api/groups" style={{ fontSize:11, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", padding:"6px 10px", borderRadius:10 }}>GET /groups</a>
                <a href="/api/health" style={{ fontSize:11, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", padding:"6px 10px", borderRadius:10 }}>health</a>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="النشاط الأخير" desc="Timeline" />
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
              {[
                { t:"تم تأكيد فوج مكة 01", d:"38 معتمر • فندق الصفوة", tm:"منذ ساعتين", c:"#0f766e" },
                { t:"وثائق فاطمة الزهراء مكتملة", d:"جواز + تطعيم • بانتظار الحجز", tm:"منذ 5 ساعات", c:"#7c3aed" },
                { t:"فاتورة INV-2026-002 صدرت", d:"189,000 دج • ZATCA QR", tm:"أمس", c:"#0891b2" },
              ].map((a,i)=>(
                <div key={i} style={{ display:"flex", gap:10 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <span style={{ width:10, height:10, borderRadius:999, background:a.c, boxShadow:`0 0 0 4px ${a.c}18` }}/>
                    {i<2 && <span style={{ width:2, flex:1, background:"#e2e8f0", marginTop:6, minHeight:18 }}/>}
                  </div>
                  <div style={{ flex:1, paddingBottom: i<2?12:0 }}>
                    <div style={{ fontWeight:800, fontSize:12 }}>{a.t}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{a.d} • {a.tm}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Pilgrims
function PilgrimsView(){
  const [q,setQ]=useState("");
  const [filter,setFilter]=useState("all");
  const [pilgrims,setPilgrims]=useState<any[]>(mockPilgrims);
  const [groups]=useState<any[]>(mockGroups);
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState<"table"|"grid">("table");
  const [open,setOpen]=useState(false);
  const [edit,setEdit]=useState<any>(null);
  const [form,setForm]=useState({ fullNameAr:"", fullNameEn:"", passportNumber:"", nationality:"DZ", phone:"", status:"DRAFT", groupName:"" });

  const fetchPilgrims=()=>{
    setLoading(true);
    const p=new URLSearchParams();
    if(filter!=="all") p.set("status",filter);
    if(q) p.set("search",q);
    fetch(`/api/pilgrims?${p.toString()}`).then(r=>r.json()).then(d=> d.data && setPilgrims(d.data)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ fetchPilgrims(); },[filter]);
  useEffect(()=>{ const t=setTimeout(fetchPilgrims,300); return ()=>clearTimeout(t); },[q]);

  const resetForm=()=> setForm({ fullNameAr:"", fullNameEn:"", passportNumber:"", nationality:"DZ", phone:"", status:"DRAFT", groupName:"" });

  const handleCreate=async()=>{
    if(!form.fullNameAr || !form.passportNumber) return alert("الاسم و جواز السفر مطلوبان");
    setLoading(true);
    const method = edit ? "PATCH" : "POST";
    const url = edit ? `/api/pilgrims/${edit.id}` : "/api/pilgrims";
    const res=await fetch(url,{ method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(form) });
    if(res.ok){
      const created=await res.json();
      if(edit) setPilgrims(prev=>prev.map(p=>p.id===edit.id? created : p));
      else setPilgrims(prev=>[created, ...prev]);
      setOpen(false); setEdit(null); resetForm();
    }
    setLoading(false);
  };
  const handleDelete=async (id:string)=>{
    if(!confirm("تأكيد حذف المعتمر؟")) return;
    await fetch(`/api/pilgrims/${id}`,{ method:"DELETE" });
    setPilgrims(prev=>prev.filter(p=>p.id!==id));
  };
  const openEdit=(p:any)=>{ setEdit(p); setForm({ fullNameAr:p.fullNameAr, fullNameEn:p.fullNameEn||"", passportNumber:p.passportNumber, nationality:p.nationality||"DZ", phone:p.phone||"", status:p.status, groupName:p.groupName||"" }); setOpen(true); };

  const statuses = ["DRAFT","REGISTERED","DOCUMENTS_UPLOADED","READY_FOR_BOOKING","BOOKED","PERMIT_ISSUED","COMPLETED"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }} className="fade">
      <TopBar title="المعتمرون" subtitle={`${pilgrims.length} معتمر • ${loading? "جاري التحديث..." : "مباشر من API"} • فلترة وبحث فوري`} crumbs={["الرئيسية","المعتمرون"]}/>

      <Card>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ flex:"1 1 260px", display:"flex", alignItems:"center", gap:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"8px 10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث بالاسم، جواز السفر، الهاتف..." style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13 }} />
            {q && <button onClick={()=>setQ("")} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"2px 8px", fontSize:11, cursor:"pointer" }}>مسح</button>}
          </div>

          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Pill active={filter==="all"} onClick={()=>setFilter("all")}>الكل</Pill>
            {statuses.slice(0,5).map(s=> <Pill key={s} active={filter===s} onClick={()=>setFilter(s)}><span className="dot" style={{ background:statusColors[s] }}/>{statusLabels[s]}</Pill>)}
          </div>

          <div style={{ display:"flex", gap:8, marginInlineStart:"auto" }}>
            <div style={{ display:"flex", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:10, padding:3, gap:3 }}>
              <button onClick={()=>setView("table")} style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", background:view==="table"?"#fff":"transparent", boxShadow:view==="table"?"0 1px 4px rgba(15,23,42,.08)":"none", fontSize:12, fontWeight:700 }}>جدول</button>
              <button onClick={()=>setView("grid")} style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", background:view==="grid"?"#fff":"transparent", boxShadow:view==="grid"?"0 1px 4px rgba(15,23,42,.08)":"none", fontSize:12, fontWeight:700 }}>بطاقات</button>
            </div>
            <button onClick={()=>{ setEdit(null); resetForm(); setOpen(true); }} className="btn btn-primary">+ إضافة معتمر</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap", color:"#64748b", fontSize:12 }}>
          <span>تلميح:</span><span className="kbd">/</span><span>للبحث</span><span>•</span><span>اضغط على الصف للتعديل</span><span>•</span><span style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", color:"#065f46", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>تمت المزامنة مع /api/pilgrims</span>
        </div>
      </Card>

      {view==="table" ? (
        <Card padding={0} style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table className="table">
              <thead><tr><th style={{ width:16 }}><input type="checkbox"/></th><th>المعتمر</th><th>جواز السفر</th><th>الجنسية</th><th>الفوج</th><th>التقدم</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {pilgrims.map((p:any)=>{
                  const step = statuses.indexOf(p.status);
                  return (
                    <tr key={p.id} onClick={()=>openEdit(p)} style={{ cursor:"pointer" }}>
                      <td><input type="checkbox" onClick={e=>e.stopPropagation()}/></td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Avatar name={p.fullNameAr}/>
                          <div>
                            <div style={{ fontWeight:800, fontSize:13, display:"flex", gap:6, alignItems:"center" }}>{p.fullNameAr} <span style={{ background:"#f8fafc", border:"1px solid #e2e8f0", padding:"1px 6px", borderRadius:999, fontSize:10 }}>{p.gender==="FEMALE"?"سيدة":"سيد"}</span></div>
                            <div style={{ fontSize:11, color:"#64748b", display:"flex", gap:8 }}><span>{p.fullNameEn}</span><span>•</span><span dir="ltr">{p.phone||"—"}</span></div>
                          </div>
                        </div>
                      </td>
                      <td><div style={{ fontFamily:"monospace", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}><span style={{ background:"#f8fafc", border:"1px solid #e2e8f0", padding:"3px 7px", borderRadius:8 }}>{p.passportNumber}</span><button onClick={e=>{e.stopPropagation(); navigator.clipboard.writeText(p.passportNumber)}} style={{ border:"none", background:"#fff", cursor:"pointer", color:"#64748b" }} title="نسخ">⎘</button></div><div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>ينتهي: {p.passportExpiry||"—"}</div></td>
                      <td><span style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", padding:"4px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>{p.nationality}</span></td>
                      <td><span style={{ background:p.groupName?"#ecfdf5":"#f8fafc", border:`1px solid ${p.groupName?"#a7f3d0":"#e2e8f0"}`, color:p.groupName?"#065f46":"#64748b", padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>{p.groupName||"غير مسند"}</span></td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ display:"flex", gap:4 }}>
                          {statuses.map((s,i)=> <span key={s} title={statusLabels[s]} style={{ flex:1, height:6, borderRadius:999, background: i<=step? (statusColors[p.status]||"#0f766e") : "#e2e8f0", opacity: i<=step?1:.6 }}/>)}
                        </div>
                        <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>{step+1} / {statuses.length} • {statusLabels[p.status]}</div>
                      </td>
                      <td><Badge status={p.status} dot/></td>
                      <td>
                        <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>openEdit(p)} className="btn btn-ghost" style={{ padding:"6px 10px" }}>تعديل</button>
                          <button onClick={()=>handleDelete(p.id)} style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", padding:"6px 10px", borderRadius:10, fontSize:12, cursor:"pointer", fontWeight:700 }}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pilgrims.length===0 && <Empty title="لا توجد نتائج" desc="جرب تغيير البحث أو الفلتر، أو أضف معتمراً جديداً" action={<button onClick={()=>{resetForm();setOpen(true)}} className="btn btn-primary">إضافة معتمر</button>}/>}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px", borderTop:"1px solid #e2e8f0", background:"#f8fafc", fontSize:12, color:"#64748b", flexWrap:"wrap", gap:8 }}>
            <span>إجمالي: {pilgrims.length} • صفحة 1 من 1</span>
            <span style={{ display:"flex", gap:6 }}><button className="btn btn-ghost" style={{ padding:"6px 10px" }}>السابق</button><button className="btn btn-dark" style={{ padding:"6px 12px" }}>التالي</button></span>
          </div>
        </Card>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {pilgrims.map((p:any)=>(
            <Card key={p.id} hover style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <Avatar name={p.fullNameAr} size={44}/>
                <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:800 }}>{p.fullNameAr}</div><div style={{ fontSize:12, color:"#64748b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.fullNameEn}</div></div>
                <Badge status={p.status} dot/>
              </div>
              <div className="divider"/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}><span style={{ color:"#64748b" }}>جواز</span><span style={{ fontFamily:"monospace", fontWeight:800 }}>{p.passportNumber}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}><span style={{ color:"#64748b" }}>الفوج</span><span style={{ fontWeight:700 }}>{p.groupName||"—"}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}><span style={{ color:"#64748b" }}>هاتف</span><span dir="ltr">{p.phone||"—"}</span></div>
              <div style={{ display:"flex", gap:6, marginTop:4 }}>
                <button onClick={()=>openEdit(p)} className="btn btn-primary" style={{ flex:1 }}>عرض</button>
                <button onClick={()=>handleDelete(p.id)} className="btn btn-ghost" style={{ color:"#dc2626", borderColor:"#fecaca", background:"#fef2f2" }}>حذف</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={()=>{ setOpen(false); setEdit(null); }} title={edit? "تعديل معتمر" : "إضافة معتمر جديد"} width={620}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>الاسم بالعربية *<input value={form.fullNameAr} onChange={e=>setForm({...form, fullNameAr:e.target.value})} placeholder="مثال: عبد الله محمد" className="input"/></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>الاسم بالإنجليزية<input value={form.fullNameEn} onChange={e=>setForm({...form, fullNameEn:e.target.value})} placeholder="As in passport" className="input" dir="ltr"/></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>رقم جواز السفر *<input value={form.passportNumber} onChange={e=>setForm({...form, passportNumber:e.target.value})} placeholder="A12345678" className="input" dir="ltr"/></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>الجنسية<select value={form.nationality} onChange={e=>setForm({...form, nationality:e.target.value})} className="input"><option value="DZ">DZ - الجزائر</option><option value="SA">SA - السعودية</option><option value="MA">MA - المغرب</option><option value="TN">TN - تونس</option><option value="EG">EG - مصر</option></select></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>رقم الهاتف<input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="+213 5xx xxx xxx" className="input" dir="ltr"/></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700 }}>الحالة<select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="input">{Object.entries(statusLabels).slice(0,7).map(([k,v])=> <option key={k} value={k}>{v}</option>)}</select></label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:700, gridColumn:"1 / -1" }}>الفوج<select value={form.groupName} onChange={e=>setForm({...form, groupName:e.target.value})} className="input"><option value="">غير مسند</option>{groups.map((g:any)=> <option key={g.id} value={g.name}>{g.name}</option>)}</select></label>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:14, justifyContent:"flex-end" }}>
          <button onClick={()=>{ setOpen(false); setEdit(null); }} className="btn btn-ghost">إلغاء</button>
          <button onClick={handleCreate} className="btn btn-primary" style={{ minWidth:120 }}>{loading? "جاري الحفظ..." : edit? "تحديث" : "حفظ المعتمر"}</button>
        </div>
      </Modal>
    </div>
  );
}

function GroupsView(){
  const [groups,setGroups]=useState<any[]>(mockGroups);
  const [q,setQ]=useState("");
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({ name:"", description:"", maxSize:30, status:"DRAFT" as any });
  const [pilgrims,setPilgrims]=useState<any[]>([]);
  useEffect(()=>{ fetch("/api/groups").then(r=>r.json()).then(d=> d.data && setGroups(d.data)).catch(()=>{}); fetch("/api/pilgrims").then(r=>r.json()).then(d=> d.data && setPilgrims(d.data)).catch(()=>{}); },[]);
  const create=async()=>{
    if(!form.name) return alert("اسم الفوج مطلوب");
    const res=await fetch("/api/groups",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ...form, maxSize:Number(form.maxSize) }) });
    if(res.ok){ const g=await res.json(); setGroups(prev=>[...prev,g]); setShow(false); setForm({ name:"", description:"", maxSize:30, status:"DRAFT" }); }
  };
  const filtered = q? groups.filter((g:any)=> g.name.includes(q) || (g.description||"").includes(q)) : groups;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }} className="fade">
      <TopBar title="الأفواج" subtitle={`إدارة المجموعات • ${filtered.length} فوج • سعة إجمالية ${filtered.reduce((s:any,g:any)=>s+g.maxSize,0)}`} crumbs={["الرئيسية","الأفواج"]}/>
      <Card>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ flex:"1 1 240px", display:"flex", alignItems:"center", gap:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"8px 10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن فوج..." style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13 }}/>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Pill active><span className="dot" style={{ background:"#0f766e" }}/>الكل</Pill>
            <Pill><span className="dot" style={{ background:"#10b981" }}/>مؤكد</Pill>
            <Pill><span className="dot" style={{ background:"#f59e0b" }}/>جاهز</Pill>
          </div>
          <button onClick={()=>setShow(!show)} className="btn btn-primary" style={{ marginInlineStart:"auto" }}>{show? "إغلاق" : "+ إنشاء فوج"}</button>
        </div>
        {show && (
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, background:"#f0fdfa", border:"1px solid #a7f3d0", borderRadius:12, padding:12 }}>
            <input placeholder="اسم الفوج *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="input"/>
            <input placeholder="الوصف" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="input"/>
            <input type="number" placeholder="السعة القصوى" value={form.maxSize} onChange={e=>setForm({...form, maxSize:Number(e.target.value)})} className="input"/>
            <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="input"><option value="DRAFT">مسودة</option><option value="READY">جاهز</option><option value="CONFIRMED">مؤكد</option></select>
            <div style={{ gridColumn:"1 / -1", display:"flex", gap:8, justifyContent:"flex-end" }}><button onClick={()=>setShow(false)} className="btn btn-ghost">إلغاء</button><button onClick={create} className="btn btn-primary">إنشاء الفوج</button></div>
          </div>
        )}
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
        {filtered.map((g:any)=>{
          const pct=Math.round((g.memberCount/g.maxSize)*100);
          const pilgrimSlice = pilgrims.filter((p:any)=>p.groupName===g.name).slice(0,4);
          return (
            <div key={g.id} className="card card-hover" style={{ overflow:"hidden", padding:0, display:"flex", flexDirection:"column" }}>
              <div style={{ height:86, background:"linear-gradient(135deg,#0b1220 0%,#0f766e 55%,#06b6d4 100%)", position:"relative", padding:14, display:"flex", alignItems:"flex-end", color:"#fff" }}>
                <div style={{ position:"absolute", inset:0, background:"radial-gradient(400px 80px at 70% 10%,rgba(255,255,255,.12),transparent)" }}/>
                <div style={{ position:"relative", display:"flex", alignItems:"center", gap:10, width:"100%" }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.18)", display:"grid", placeItems:"center", backdropFilter:"blur(8px)", fontSize:20 }}>🕋</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:900, fontSize:14 }}>{g.name}</div><div style={{ fontSize:11, opacity:.85 }}>{g.description}</div></div>
                  <Badge status={g.status}/>
                </div>
                <div style={{ position:"absolute", top:10, insetInlineEnd:10, background:"rgba(255,255,255,.92)", color:"#0b1220", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>{g.scheduledDate}</div>
              </div>
              <div style={{ padding:14, flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748b" }}><span>السعة</span><span>{g.memberCount} / {g.maxSize}</span></div>
                    <div className="progress" style={{ marginTop:6 }}><span style={{ width:`${pct}%`, background: pct>80?"#0f766e": pct>50?"#0ea5e9":"#f59e0b" }}/></div>
                  </div>
                  <Ring pct={pct} color={pct>80?"#0f766e":"#0ea5e9"}/>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center" }}>
                    {pilgrimSlice.length? pilgrimSlice.map((p:any,i:number)=> <div key={p.id} style={{ marginInlineStart: i===0?0:-8, border:"2px solid #fff", borderRadius:999, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.12)" }}><Avatar name={p.fullNameAr} size={30}/></div>) : <span style={{ fontSize:11, color:"#94a3b8" }}>لا يوجد أعضاء بعد</span>}
                    {pilgrimSlice.length>0 && <span style={{ marginInlineStart:6, background:"#f1f5f9", border:"1px solid #e2e8f0", padding:"2px 7px", borderRadius:999, fontSize:11, fontWeight:700 }}>+{Math.max(0,g.memberCount-pilgrimSlice.length)} آخر</span>}
                  </div>
                  <span style={{ marginInlineStart:"auto", fontSize:11, color:"#64748b", display:"flex", gap:6, alignItems:"center" }}><span className="dot" style={{ background:pct>80?"#10b981":"#0ea5e9" }}/>{pct>80?"ممتلئ تقريباً" : pct>50?"متقدّم":"قيد التجميع"}</span>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button className="btn btn-dark" style={{ flex:1 }}>إدارة الأعضاء</button>
                  <button className="btn btn-ghost">تصدير</button>
                  <button className="btn btn-ghost" title="مشاركة">↗</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length===0 && <Empty title="لا توجد أفواج" desc="أنشئ أول فوج لك وابدأ بإضافة المعتمرين" action={<button onClick={()=>setShow(true)} className="btn btn-primary">إنشاء فوج</button>}/>}
    </div>
  );
}

function InvoicesView(){
  const [invoices,setInvoices]=useState<any[]>(mockInvoices);
  useEffect(()=>{ fetch("/api/invoices").then(r=>r.json()).then(d=> d.data && setInvoices(d.data)).catch(()=>{}); },[]);
  const total=invoices.reduce((s:any,i:any)=>s+i.amount,0);
  const paid=invoices.filter((i:any)=>i.status==="PAID").reduce((s:any,i:any)=>s+i.amount,0);
  const overdue=invoices.filter((i:any)=>i.status==="OVERDUE").reduce((s:any,i:any)=>s+i.amount,0);
  const max = Math.max(1, ...invoices.map((i:any)=>i.amount));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }} className="fade">
      <TopBar title="الفوترة" subtitle={`ZATCA compliant • ${invoices.length} فواتير • إجمالي ${fmtMoney(total)}`} crumbs={["الرئيسية","المالية","الفوترة"]}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
        <Kpi icon="💰" label="الإجمالي" value={fmtMoney(total)} sub="3 فواتير • شامل الضريبة" color="#0f766e" data={[80,90,85,100,95,110,105,120]}/>
        <Kpi icon="✅" label="مدفوع" value={fmtMoney(paid)} sub="1 فاتورة • تم التأكيد" color="#059669" data={[40,45,42,50,48,55,52,60]}/>
        <Kpi icon="⚠️" label="متأخر" value={fmtMoney(overdue)} sub="يحتاج متابعة" color="#e11d48" data={[30,28,32,30,35,33,38,36]}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.5fr) 0.9fr", gap:12 }}>
        <Card padding={0} style={{ overflow:"hidden" }}>
          <div style={{ padding:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <SectionTitle title="الفواتير الأخيرة" desc="مع حالة ZATCA وQR" />
            <button className="btn btn-primary">+ فاتورة جديدة</button>
          </div>
          <div style={{ padding:"0 12px 12px" }}>
            <div style={{ border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
              <table className="table">
                <thead><tr><th>الفاتورة</th><th>المبلغ</th><th>الحالة</th><th>الاستحقاق</th><th>ZATCA</th><th></th></tr></thead>
                <tbody>
                  {invoices.map((inv:any)=>(
                    <tr key={inv.id}>
                      <td><span style={{ fontFamily:"monospace", fontWeight:800, background:"#f8fafc", border:"1px solid #e2e8f0", padding:"4px 8px", borderRadius:8 }}>{inv.invoiceNumber}</span></td>
                      <td style={{ fontWeight:800 }}>{fmtMoney(inv.amount, inv.currency)}<div style={{ width:80, marginTop:4 }} className="progress"><span style={{ width:`${(inv.amount/max)*100}%`, background: inv.status==="OVERDUE"?"#e11d48": inv.status==="PAID"?"#059669":"#0f766e" }}/></div></td>
                      <td><Badge status={inv.status} dot/></td>
                      <td style={{ fontSize:12, color:"#64748b" }}>{inv.dueDate}</td>
                      <td><span style={{ background: inv.status==="PAID"?"#ecfdf5":"#fffbeb", border:`1px solid ${inv.status==="PAID"?"#a7f3d0":"#fde68a"}`, color: inv.status==="PAID"?"#065f46":"#92400e", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>{inv.status==="PAID"?"QR ✓":"QR …"}</span></td>
                      <td><button className="btn btn-ghost" style={{ padding:"6px 10px" }}>عرض PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", borderColor:"#fde68a" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"#fff", border:"1px solid #fde68a", display:"grid", placeItems:"center", fontSize:18 }}>🔳</div>
              <div><div style={{ fontWeight:900, fontSize:13 }}>QR ZATCA</div><div style={{ fontSize:11, color:"#92400e" }}>يُولّد تلقائياً عند الإصدار</div></div>
            </div>
            <div style={{ marginTop:10, background:"#fff", border:"1px solid #fde68a", borderRadius:12, padding:12, display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:72, height:72, borderRadius:10, background:"repeating-linear-gradient(45deg,#f1f5f9 0 4px,#e2e8f0 4px 8px)", border:"1px solid #e2e8f0", display:"grid", placeItems:"center", fontSize:11, color:"#64748b", fontWeight:700 }}>QR</div>
              <div style={{ flex:1 }}><div style={{ fontFamily:"monospace", fontSize:11, color:"#92400e", background:"#fffbeb", border:"1px dashed #fde68a", padding:"6px 8px", borderRadius:8, wordBreak:"break-all" }}>zatcaHash: 7f3a9c... • zatcaQr: AR • Amount: 245000 DZD</div><div style={{ fontSize:11, color:"#a16207", marginTop:6 }}>متوافق مع هيئة الزكاة والضريبة السعودية</div></div>
            </div>
            <button className="btn btn-ghost" style={{ width:"100%", marginTop:10 }}>تحميل QR</button>
          </Card>
          <Card>
            <SectionTitle title="ملخص التحصيل" desc="آخر 6 أشهر"/>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:60, marginTop:10 }}>
              {[45,62,48,78,66,90].map((h,i)=> <div key={i} style={{ flex:1, height:`${h}%`, background: i===5?"#0f766e":"#cbd5e1", borderRadius:"8px 8px 4px 4px", transition:".3s" }}/>)}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#94a3b8", marginTop:6 }}><span>يناير</span><span>يونيو</span></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DocumentsView(){
  const [drag,setDrag]=useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }} className="fade">
      <TopBar title="الوثائق" subtitle="إدارة جوازات السفر، التأشيرات، الصور وشهادات التطعيم — رفع + OCR قريباً" crumbs={["الرئيسية","الوثائق"]}/>
      <Card style={{ borderStyle:"dashed", background:drag?"#ecfdf5":"#f8fafc", borderColor: drag? "#34d399":"#cbd5e1", textAlign:"center", padding:22, transition:".16s" }} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false)}}>
        <div style={{ width:52, height:52, borderRadius:14, background:"#fff", border:"1px solid #e2e8f0", display:"grid", placeItems:"center", margin:"0 auto", fontSize:22, boxShadow:"0 4px 12px rgba(15,23,42,.06)" }}>⬆</div>
        <div style={{ fontWeight:900, marginTop:10 }}>اسحب وأفلت الملفات هنا</div>
        <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>PDF, JPG, PNG — حتى 10MB • يتم فحص الجودة تلقائياً و OCR لجواز السفر</div>
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:12 }}>
          <button className="btn btn-primary">اختيار ملفات</button>
          <button className="btn btn-ghost">التقاط بالكاميرا</button>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
        {[
          { t:"جواز السفر", sub:"PASSPORT", n:6, total:6, pct:100, icon:"🛂", color:"#0ea5e9" },
          { t:"التأشيرة", sub:"VISA", n:3, total:6, pct:50, icon:"🛃", color:"#7c3aed" },
          { t:"الصورة الشخصية", sub:"PHOTO", n:6, total:6, pct:100, icon:"🖼️", color:"#059669" },
          { t:"شهادة التطعيم", sub:"VACCINATION", n:2, total:6, pct:33, icon:"💉", color:"#d97706" },
        ].map(d=>(
          <Card key={d.sub} hover>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${d.color}12`, border:`1px solid ${d.color}20`, display:"grid", placeItems:"center", fontSize:18 }}>{d.icon}</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:800, fontSize:13 }}>{d.t}</div><div style={{ fontSize:11, color:"#64748b" }}>{d.sub} • {d.n}/{d.total}</div></div>
              <Ring pct={d.pct} size={38} color={d.color}/>
            </div>
            <div className="progress" style={{ marginTop:10 }}><span style={{ width:`${d.pct}%`, background:d.color }}/></div>
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }}>عرض</button>
              <button className="btn btn-primary" style={{ flex:1 }}>رفع</button>
            </div>
          </Card>
        ))}
      </div>

      <Card padding={0} style={{ overflow:"hidden" }}>
        <div style={{ padding:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <SectionTitle title="آخر الرفوعات" desc="مع حالة التحقق و OCR" />
          <button className="btn btn-ghost">عرض الكل</button>
        </div>
        <div style={{ padding:"0 12px 12px" }}>
          <div style={{ border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
            <table className="table">
              <thead><tr><th>الملف</th><th>النوع</th><th>المعتمر</th><th>الحجم</th><th>التحقق</th><th></th></tr></thead>
              <tbody>
                {[
                  { name:"جواز_عبدالله.pdf", type:"PASSPORT", who:"عبد الله محمد", size:"1.2 MB", ok:true },
                  { name:"تأشيرة_فاطمة.jpg", type:"VISA", who:"فاطمة الزهراء", size:"860 KB", ok:false },
                  { name:"تطعيم_أحمد.png", type:"VACCINATION", who:"أحمد القاضي", size:"540 KB", ok:true },
                ].map((f,i)=>(
                  <tr key={i}>
                    <td><div style={{ display:"flex", gap:8, alignItems:"center" }}><span style={{ width:30, height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", display:"grid", placeItems:"center", fontSize:14 }}>📄</span><span style={{ fontWeight:700 }}>{f.name}</span></div></td>
                    <td><span style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>{f.type}</span></td>
                    <td>{f.who}</td>
                    <td style={{ fontSize:12, color:"#64748b" }}>{f.size}</td>
                    <td>{f.ok? <span style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", color:"#065f46", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>✓ موثّق</span> : <span style={{ background:"#fffbeb", border:"1px solid #fde68a", color:"#92400e", padding:"3px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>بانتظار</span>}</td>
                    <td><button className="btn btn-ghost" style={{ padding:"6px 10px" }}>فتح</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Page(){
  const [tab,setTab]=useState("dashboard");
  const crumbMap:any = { dashboard:["الرئيسية"], pilgrims:["الرئيسية","المعتمرون"], groups:["الرئيسية","الأفواج"], invoices:["الرئيسية","الفوترة"], documents:["الرئيسية","الوثائق"] };
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>
      <Sidebar active={tab} onChange={setTab}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ flex:1, padding:14, background:"var(--bg)" }}>
          {tab==="dashboard" && <Dashboard onNavigate={setTab}/>}
          {tab==="pilgrims" && <PilgrimsView/>}
          {tab==="groups" && <GroupsView/>}
          {tab==="invoices" && <InvoicesView/>}
          {tab==="documents" && <DocumentsView/>}
        </div>
        <div style={{ background:"#fff", borderTop:"1px solid #e2e8f0", padding:"10px 14px", display:"flex", justifyContent:"space-between", fontSize:11, color:"#94a3b8", flexWrap:"wrap", gap:8 }}>
          <span>© 2026 Rihal | رحال — منصة إدارة وكالات الحج والعمرة • صنع بعناية في الجزائر • Turborepo + pnpm + Neon RLS</span>
          <span style={{ display:"flex", gap:8 }}><a href="/api" style={{ color:"#0f766e", fontWeight:700 }}>API</a><span>•</span><a href="https://github.com/mamourgroupe-ctrl/rihal" style={{ color:"#64748b" }}>GitHub</a><span>•</span><span>دعم: support@rihal.dz</span></span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";

const BASE_URL = "http://101.53.132.91:8001";

const COLORS = {
  c1: "#4f46e5", c2: "#d97706", c3: "#0891b2", c4: "#7c3aed", avg: "#dc2626",
};
const CORNER_LABELS = {
  c1: "Corner 1", c2: "Corner 2", c3: "Corner 3", c4: "Corner 4", avg: "Average",
};

// ─── CALENDAR ─────────────────────────────────────────────────
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DOWS   = ["S","M","T","W","T","F","S"];
function pad2(n) { return String(n).padStart(2,"0"); }
function toDS(y,m,d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }

function MiniCal({ view, onNav, dataDates, startDate, endDate, onPick }) {
  const { y, m } = view;
  const first = new Date(y,m,1).getDay();
  const days  = new Date(y,m+1,0).getDate();
  const prev  = new Date(y,m,0).getDate();

  function rc(ds) {
    if (ds === startDate || ds === endDate) return "sel";
    if (startDate && endDate && ds > startDate && ds < endDate) return "inrange";
    return "";
  }

  const cells = [];
  for (let i = 0; i < first; i++) cells.push({ d: prev-first+1+i, ds:"", other:true });
  for (let d = 1; d <= days; d++) cells.push({ d, ds: toDS(y,m,d), other:false });

  return (
    <div style={C.calWrap}>
      <div style={C.calHead}>
        <button style={C.calNav} onClick={() => onNav(-1)}>‹</button>
        <span style={C.calMonth}>{MONTHS[m]} {y}</span>
        <button style={C.calNav} onClick={() => onNav(1)}>›</button>
      </div>
      <div style={C.calGrid}>
        {DOWS.map((d,i) => <div key={i} style={C.dow}>{d}</div>)}
        {cells.map(({ d, ds, other }, i) => {
          const r  = other ? "" : rc(ds);
          const hd = !other && dataDates.has(ds);
          return (
            <div
              key={i}
              onClick={() => !other && onPick(ds)}
              style={{
                ...C.day,
                ...(other ? C.dayOther : {}),
                ...(r === "sel"     ? C.daySel   : {}),
                ...(r === "inrange" ? C.dayRange  : {}),
                cursor: other ? "default" : "pointer",
                position: "relative",
              }}
            >
              {d}
              {hd && (
                <span style={{
                  position:"absolute", bottom:"2px", left:"50%",
                  transform:"translateX(-50%)", width:"4px", height:"4px",
                  borderRadius:"50%",
                  background: r === "sel" ? "#fff" : "#dc2626",
                  display:"block",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalPicker({ startDate, endDate, onStart, onEnd, dataDates }) {
  const now = new Date();
  const [v1, setV1] = useState({ y: now.getFullYear(), m: now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1 });
  const [v2, setV2] = useState({ y: now.getFullYear(), m: now.getMonth() });
  function nav(which, dir) {
    const set = which === 1 ? setV1 : setV2;
    set(p => {
      let mm = p.m + dir, yy = p.y;
      if (mm > 11) { mm = 0; yy++; }
      if (mm < 0)  { mm = 11; yy--; }
      return { y: yy, m: mm };
    });
  }
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
        <div>
          <div style={C.miniLabel}>FROM</div>
          <MiniCal view={v1} onNav={d => nav(1,d)} dataDates={dataDates} startDate={startDate} endDate={endDate} onPick={onStart} />
        </div>
        <div>
          <div style={C.miniLabel}>TO</div>
          <MiniCal view={v2} onNav={d => nav(2,d)} dataDates={dataDates} startDate={startDate} endDate={endDate} onPick={onEnd} />
        </div>
      </div>
      <div style={{ display:"flex", gap:"14px" }}>
        <div style={C.legItem}><span style={{ ...C.legDot, background:"#dc2626" }} />has data</div>
        <div style={C.legItem}><span style={{ ...C.legDot, background:"#4f46e5" }} />selected</div>
      </div>
    </div>
  );
}

// ─── CALENDAR STYLES ──────────────────────────────────────────
const C = {
  calWrap:   { background:"#f5f5fb", borderRadius:"6px", padding:"10px", border:"0.5px solid #e2e1f0" },
  calHead:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" },
  calNav:    { background:"none", border:"0.5px solid #d4d2e8", borderRadius:"4px", color:"#9896c0", fontSize:"14px", cursor:"pointer", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 },
  calMonth:  { fontSize:"10px", fontWeight:"500", letterSpacing:"0.1em", color:"#2d2b5e", fontFamily:"'DM Mono',monospace" },
  calGrid:   { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"1px" },
  dow:       { fontSize:"8px", letterSpacing:"0.06em", color:"#b0aed0", textAlign:"center", padding:"3px 0", fontFamily:"'DM Mono',monospace" },
  day:       { textAlign:"center", padding:"4px 1px", fontSize:"10px", borderRadius:"3px", color:"#6e6c96", fontFamily:"'DM Mono',monospace" },
  dayOther:  { color:"#d4d2e8" },
  daySel:    { background:"#4f46e5", color:"#fff", borderRadius:"3px" },
  dayRange:  { background:"#eeeeff", color:"#4f46e5" },
  miniLabel: { fontSize:"8px", letterSpacing:"0.14em", color:"#b0aed0", marginBottom:"5px", fontFamily:"'DM Mono',monospace" },
  legItem:   { display:"flex", alignItems:"center", gap:"5px", fontSize:"9px", color:"#a0a0c0", letterSpacing:"0.06em", fontFamily:"'DM Mono',monospace" },
  legDot:    { display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", flexShrink:0 },
};

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [history, setHistory]     = useState([]);
  const [selected, setSelected]   = useState([]);
  const [datasets, setDatasets]   = useState({});
  const [uploading, setUploading] = useState(false);
  const [visibleLines, setVisibleLines] = useState({ c1:true, c2:true, c3:true, c4:true, avg:true });
  const [activeTab, setActiveTab] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [dataDates, setDataDates] = useState(new Set());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedUnit, setSelectedUnit]       = useState(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) => setActiveTab(p => ({ ...p, [id]: tab }));

  useEffect(() => {
    const st = localStorage.getItem("selectedStation");
    const un = localStorage.getItem("selectedUnit");
    if (st) setSelectedStation(JSON.parse(st));
    if (un) setSelectedUnit(JSON.parse(un));
    fetchHistory();
    fetchMappingDates();
  }, []);

  useEffect(() => {
    if (selected.length > 2)
      setVisibleLines({ c1:false, c2:false, c3:false, c4:false, avg:true });
  }, [selected]);

  const fetchMappingDates = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/mapping-dates`, { params:{ station_id:1, unit_id:1 } });
      setDataDates(new Set(res.data.map(r => r.run_date)));
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async () => {
    const res  = await axios.get(`${BASE_URL}/history?station_id=1&unit_id=1`);
    const data = res.data;
    setHistory(data);
    if (data.length >= 2) {
      const two = data.slice(-2);
      const responses = await Promise.all(two.map(i => axios.get(`${BASE_URL}/history/${i.run_id}`)));
      const ds = {};
      responses.forEach((r,idx) => { ds[two[idx].run_id] = r.data; });
      setDatasets(p => ({ ...p, ...ds }));
      setSelected(two.map(i => i.run_id));
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("station_id",1);
    fd.append("unit_id",1); fd.append("uploaded_by","admin"); fd.append("notes","");
    await axios.post(`${BASE_URL}/upload`, fd);
    await fetchHistory();
    await fetchMappingDates();
    setUploading(false);
  };

  const toggleSelection = async (item) => {
    if (selected.includes(item.run_id)) {
      setSelected(p => p.filter(id => id !== item.run_id)); return;
    }
    if (!datasets[item.run_id]) {
      const res = await axios.get(`${BASE_URL}/history/${item.run_id}`);
      setDatasets(p => ({ ...p, [item.run_id]: res.data }));
    }
    setSelected(p => [...p, item.run_id]);
  };

  const buildRunData = (ds) =>
    ds.elevation.map((el,i) => ({
      elevation: Number(el),
      c1: Number(ds.corner1[i]), c2: Number(ds.corner2[i]),
      c3: Number(ds.corner3[i]), c4: Number(ds.corner4[i]),
      avg: Number(ds.average[i]),
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={S.tooltip}>
        <div style={S.ttHead}>
          <span style={S.ttLabel}>ELEVATION</span>
          <span style={S.ttVal}>{label}m</span>
        </div>
        {payload.map(e => (
          <div key={e.dataKey} style={S.ttRow}>
            <span style={{ ...S.ttDot, background:e.color }} />
            <span style={S.ttKey}>{CORNER_LABELS[e.dataKey]}</span>
            <span style={{ ...S.ttNum, color:e.color }}>{Number(e.value).toFixed(1)}°C</span>
          </div>
        ))}
      </div>
    );
  };

  const SIDEBAR_W = 268;

  return (
    <div style={{ background:"#f0eff8", minHeight:"100vh" }}>

      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <button onClick={() => setSidebarOpen(o => !o)} style={S.hamburger}>
            {[0,1,2].map(i => <span key={i} style={S.hLine} />)}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={S.logoMark}>
              <img src={img} alt="" style={{ maxWidth:"70%", maxHeight:"70%", objectFit:"contain" }} />
            </div>
            <div>
              <div style={S.brandName}>ABHITECH FURNACE FLAME TEMPERATURE MAPPING</div>
              <div style={S.brandTag}>FURNACE FLAME TEMPERATURE MAPPING SYSTEM</div>
            </div>
          </div>
          {selectedStation && selectedUnit && (
            <div style={{ marginLeft:"auto", marginRight:"24px", textAlign:"right" }}>
              <div style={S.suLabel}>STATION · UNIT</div>
              <div style={S.suVal}>{selectedStation.name} · {selectedUnit.name}</div>
            </div>
          )}
          <div style={S.statsRow}>
            {[
              { n: history.length,  l:"RUNS"     },
              { n: selected.length, l:"SELECTED" },
            ].map(({ n, l }) => (
              <div key={l} style={S.statItem}>
                <span style={S.statN}>{n}</span>
                <span style={S.statL}>{l}</span>
              </div>
            ))}
            <div style={S.statItem}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#16a34a", display:"inline-block" }} />
              <span style={S.statL}>LIVE</span>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display:"flex" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          ...S.sidebar,
          width: SIDEBAR_W,
          transform: sidebarOpen ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
        }}>
          {/* Upload */}
          <div style={S.sideSection}>
            <div style={S.secLabel}>INGEST DATA</div>
            <label style={S.uploadBtn}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 4l3-3 3 3M2 11h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {uploading ? "UPLOADING…" : "UPLOAD EXCEL"}
              <input type="file" onChange={handleUpload} accept=".xlsx" style={{ display:"none" }} />
            </label>
          </div>

          {/* Calendar picker */}
          <div style={S.sideSection}>
            <div style={S.secLabel}>FILTER BY DATE</div>
            <CalPicker
              startDate={startDate} endDate={endDate}
              onStart={setStartDate} onEnd={setEndDate}
              dataDates={dataDates}
            />
          </div>

          {/* Run archive */}
          <div style={{ ...S.sideSection, borderBottom:"none", flex:1, overflowY:"auto" }}>
            <div style={S.secLabel}>RUN ARCHIVE</div>
            {history.length === 0 && (
              <div style={{ fontSize:"10px", color:"#b0aed0", lineHeight:1.7, letterSpacing:"0.04em", fontFamily:"'DM Mono',monospace" }}>
                No runs found. Upload an Excel file to begin.
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
              {history
                .filter(item => {
                  if (!startDate && !endDate) return true;
                  const d = new Date(item.run_date || item.run_timestamp);
                  if (startDate && d < new Date(startDate)) return false;
                  if (endDate   && d > new Date(endDate))   return false;
                  return true;
                })
                .map((item, idx) => {
                  const active = selected.includes(item.run_id);
                  return (
                    <div
                      key={item.run_id}
                      onClick={() => toggleSelection(item)}
                      style={{ ...S.runCard, ...(active ? S.runCardActive : {}) }}
                    >
                      <div style={{ ...S.runCheck, ...(active ? S.runCheckActive : {}) }}>
                        {active && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={S.runName}>{item.filename.replace(/\.[^/.]+$/,"")}</div>
                        <div style={S.runDate}>
                          {item.run_date
                            ? new Date(item.run_date).toLocaleDateString("en-GB",{ day:"2-digit", month:"short", year:"numeric" })
                            : new Date(item.run_timestamp).toLocaleDateString("en-GB",{ day:"2-digit", month:"short", year:"numeric" })
                          }
                        </div>
                      </div>
                      <div style={{ ...S.runIdx, color: active ? "#4f46e5" : "#c8c6e0" }}>
                        {String(idx+1).padStart(2,"0")}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{
          flex:1,
          marginLeft: sidebarOpen ? SIDEBAR_W : 0,
          transition:"margin-left 0.3s ease",
          padding:"20px",
          minHeight:"calc(100vh - 56px)",
        }}>
          {selected.length === 0 && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"50vh", gap:"16px" }}>
              <img src={img} alt="" style={{ width:"48px", opacity:0.3 }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.2em", color:"#c8c6e0" }}>SELECT A RUN TO ANALYZE</div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(480px, 1fr))", gap:"16px" }}>
            {selected.map((id, runIdx) => {
              const dataset = datasets[id];
              if (!dataset) return null;

              const runData = buildRunData(dataset);
              const temps   = runData.map(r => r.avg);
              const maxTemp = Math.max(...temps);
              const minTemp = Math.min(...temps);
              const avgTemp = (temps.reduce((a,b) => a+b,0) / temps.length).toFixed(1);
              const topRow  = runData.reduce((a,b) => b.elevation > a.elevation ? b : a, runData[0]);
              const botRow  = runData.reduce((a,b) => b.elevation < a.elevation ? b : a, runData[0]);
              const accents = ["#4f46e5","#d97706","#0891b2","#7c3aed","#dc2626"];
              const accent  = accents[runIdx % accents.length];

              return (
                <section key={id} style={S.runSection}>
                  {/* Run header */}
                  <div style={S.runHeader}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <div style={{ width:"3px", height:"36px", background:accent, borderRadius:"2px", flexShrink:0 }} />
                      <div>
                        <div style={{ ...S.runTitle, color:"#1e1c3a" }}>
                          {(dataset.filename||"").replace(/\.[^/.]+$/,"").toUpperCase()}
                        </div>
                        <div style={S.runSub}>{dataset.filename}</div>
                      </div>
                    </div>
                    <div style={S.kpiRow}>
                      {[
                        { l:"PEAK",   v:`${Number(topRow.avg).toFixed(0)}°C`, c:"#7c3aed" },
                        { l:"FLOOR",  v:`${Number(botRow.avg).toFixed(0)}°C`, c:"#4f46e5" },
                        { l:"MAX",    v:`${maxTemp.toFixed(0)}°C`,            c:"#dc2626" },
                        { l:"MIN",    v:`${minTemp.toFixed(0)}°C`,            c:"#0891b2" },
                        { l:"AVG",    v:`${avgTemp}°C`,                       c:"#d97706" },
                        { l:"LEVELS", v: runData.length,                      c:"#6e6c96" },
                      ].map(kpi => (
                        <div key={kpi.l} style={S.kpiCard}>
                          <div style={{ ...S.kpiVal, color:kpi.c }}>{kpi.v}</div>
                          <div style={S.kpiLbl}>{kpi.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={S.tabBar}>
                    {[{ k:"graph", l:"GRAPH" },{ k:"raw", l:"RAW DATA" }].map(({ k, l }) => (
                      <button
                        key={k}
                        onClick={() => setTab(id, k)}
                        style={{ ...S.tabBtn, ...(getTab(id) === k ? S.tabActive : {}) }}
                      >{l}</button>
                    ))}
                  </div>

                  {/* Graph */}
                  {getTab(id) === "graph" && (
                    <div style={S.chartPanel}>
                      <div style={S.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</div>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={runData} layout="vertical">
                          <CartesianGrid strokeDasharray="2 8" stroke="#e8e6f4" vertical />
                          <YAxis dataKey="elevation" reversed tick={{ fill:"#a0a0c0", fontSize:10, fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                          <XAxis type="number" domain={[d => d-100, d => d+100]} tick={{ fill:"#a0a0c0", fontSize:10, fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          {visibleLines.c1  && <Line type="monotone" dataKey="c1"  stroke={COLORS.c1}  dot={false} strokeWidth={2} />}
                          {visibleLines.c2  && <Line type="monotone" dataKey="c2"  stroke={COLORS.c2}  dot={false} strokeWidth={2} />}
                          {visibleLines.c3  && <Line type="monotone" dataKey="c3"  stroke={COLORS.c3}  dot={false} strokeWidth={2} />}
                          {visibleLines.c4  && <Line type="monotone" dataKey="c4"  stroke={COLORS.c4}  dot={false} strokeWidth={2} />}
                          {visibleLines.avg && <Line type="monotone" dataKey="avg" stroke={COLORS.avg} dot={false} strokeWidth={3} />}
                        </LineChart>
                      </ResponsiveContainer>
                      <div style={S.filterBar}>
                        {Object.keys(COLORS).map(k => (
                          <button
                            key={k}
                            onClick={() => setVisibleLines(p => ({ ...p, [k]: !p[k] }))}
                            style={{
                              ...S.filterBtn,
                              background:  visibleLines[k] ? COLORS[k] + "18" : "#f5f5fb",
                              borderColor: visibleLines[k] ? COLORS[k] : "#e2e1f0",
                              color:       visibleLines[k] ? COLORS[k] : "#a0a0c0",
                            }}
                          >{CORNER_LABELS[k]}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw data */}
                  {getTab(id) === "raw" && (
                    <div style={S.tablePanel}>
                      <div style={S.chartLabel}>RAW MEASUREMENT DATA</div>
                      <div style={{ overflowX:"auto" }}>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              {["ELEVATION (M)","CORNER 1","CORNER 2","CORNER 3","CORNER 4","AVERAGE"].map(h => (
                                <th key={h} style={S.th}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dataset.elevation.map((_,i) => (
                              <tr key={i} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                                <td style={S.td}>{dataset.elevation[i]}m</td>
                                <td style={S.td}>{dataset.corner1[i]}</td>
                                <td style={S.td}>{dataset.corner2[i]}</td>
                                <td style={S.td}>{dataset.corner3[i]}</td>
                                <td style={S.td}>{dataset.corner4[i]}</td>
                                <td style={{ ...S.td, color:"#d97706", fontWeight:500 }}>{dataset.average[i]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const S = {
  header:       { background:"#ffffff", borderBottom:"1px solid #e8e6f4", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 0 rgba(79,70,229,0.06)" },
  headerInner:  { display:"flex", alignItems:"center", gap:"16px", padding:"10px 20px", flexWrap:"wrap" },
  hamburger:    { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", gap:"4px", padding:"4px" },
  hLine:        { display:"block", width:"18px", height:"1.5px", background:"#9896c0" },
  logoMark:     { width:"36px", height:"36px", border:"1px solid #e2e1f0", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5fb", flexShrink:0 },
  brandName:    { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(13px,2vw,18px)", letterSpacing:"0.12em", color:"#1e1c3a", lineHeight:1 },
  brandTag:     { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0", marginTop:"3px" },
  suLabel:      { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.18em", color:"#b0aed0" },
  suVal:        { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5", letterSpacing:"0.08em" },
  statsRow:     { display:"flex", alignItems:"center", gap:"20px", marginLeft:"auto" },
  statItem:     { display:"flex", alignItems:"center", gap:"6px" },
  statN:        { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#4f46e5", lineHeight:1 },
  statL:        { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.15em", color:"#b0aed0" },

  sidebar:      { background:"#ffffff", borderRight:"1px solid #e8e6f4", position:"fixed", left:0, top:"56px", bottom:0, overflowY:"auto", transition:"transform 0.3s ease", zIndex:40, display:"flex", flexDirection:"column" },
  sideSection:  { padding:"16px 14px", borderBottom:"1px solid #f0eef8" },
  secLabel:     { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.28em", color:"#c8c6e0", marginBottom:"10px", paddingTop:"2px" },
  uploadBtn:    { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#eeeeff", border:"none", borderRadius:"6px", color:"#4f46e5", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", cursor:"pointer" },

  runCard:      { display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"6px", cursor:"pointer", border:"0.5px solid transparent" },
  runCardActive:{ background:"#f5f4ff", borderColor:"#c7c4f8" },
  runCheck:     { width:"14px", height:"14px", borderRadius:"3px", border:"0.5px solid #d4d2e8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:"#fff" },
  runCheckActive:{ background:"#4f46e5", borderColor:"#4f46e5" },
  runName:      { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#3a3860", letterSpacing:"0.04em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  runDate:      { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#c8c6e0", marginTop:"2px" },
  runIdx:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", letterSpacing:"0.1em" },

  runSection:   { background:"#ffffff", border:"1px solid #e8e6f4", borderRadius:"10px", overflow:"hidden" },
  runHeader:    { padding:"16px 20px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  runTitle:     { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(13px,1.8vw,18px)", letterSpacing:"0.1em", lineHeight:1 },
  runSub:       { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#c8c6e0", marginTop:"4px", letterSpacing:"0.06em" },
  kpiRow:       { display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"1px", marginTop:"12px" },
  kpiCard:      { background:"#f5f4ff", padding:"10px 8px", textAlign:"center", borderRadius:"4px" },
  kpiVal:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(13px,1.5vw,17px)", letterSpacing:"0.05em", lineHeight:1 },
  kpiLbl:       { fontFamily:"'DM Mono',monospace", fontSize:"7px", letterSpacing:"0.18em", color:"#b0aed0", marginTop:"4px" },

  tabBar:       { display:"flex", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  tabBtn:       { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"5px 12px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0" },
  tabActive:    { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },

  chartPanel:   { padding:"20px", background:"#ffffff" },
  chartLabel:   { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:"#c8c6e0", marginBottom:"16px" },
  filterBar:    { display:"flex", gap:"6px", marginTop:"14px", flexWrap:"wrap" },
  filterBtn:    { border:"0.5px solid", padding:"4px 10px", fontSize:"9px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", cursor:"pointer", borderRadius:"4px" },

  tablePanel:   { padding:"20px", background:"#ffffff" },
  table:        { width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace", fontSize:"11px" },
  th:           { padding:"8px 12px", textAlign:"left", fontSize:"8px", letterSpacing:"0.18em", color:"#c8c6e0", borderBottom:"1px solid #f0eef8", fontWeight:400 },
  td:           { padding:"8px 12px", color:"#6e6c96" },

  tooltip:      { background:"#ffffff", border:"1px solid #e8e6f4", padding:"12px 14px", minWidth:"180px", borderRadius:"6px", boxShadow:"0 4px 20px rgba(79,70,229,0.08)" },
  ttHead:       { display:"flex", justifyContent:"space-between", marginBottom:"8px", paddingBottom:"8px", borderBottom:"1px solid #f0eef8" },
  ttLabel:      { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0" },
  ttVal:        { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5" },
  ttRow:        { display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" },
  ttDot:        { width:"5px", height:"5px", borderRadius:"50%", flexShrink:0 },
  ttKey:        { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#b0aed0", flex:1 },
  ttNum:        { fontFamily:"'DM Mono',monospace", fontSize:"10px", fontWeight:"500" },
};
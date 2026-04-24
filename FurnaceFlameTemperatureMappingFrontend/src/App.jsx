import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const BASE_URL = "https://91.203.132.34:8000"; // ✅ use HTTPS

// ─── DESIGN TOKENS ───────────────────────────────────────────
const UI = {
  bg: "#f6f7fb",
  panel: "#ffffff",
  soft: "#f1f2f8",
  text: "#12121a",
  muted: "#6e6c96",
  faint: "#b0aed0",
  primary: "#4f46e5",
  secondary: "#7c3aed",
  accent: "#d97706",
  danger: "#dc2626",
  success: "#16a34a",
  border: "#e6e4f2",
  radius: "12px",
  radiusSm: "6px",
  shadowSoft: "0 4px 20px rgba(0,0,0,0.06)",
  shadowCard: "0 6px 24px rgba(79,70,229,0.08)",
};

const COLORS = {
  c1: "#4f46e5",
  c2: "#f59e0b",
  c3: "#06b6d4",
  c4: "#8b5cf6",
  avg: "#ef4444",
};
const CORNER_LABELS = {
  c1: "Corner 1", c2: "Corner 2", c3: "Corner 3", c4: "Corner 4", avg: "Average",
};

// ─── WINDOW SIZE HOOK ─────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return size;
}

// ─── CALENDAR ─────────────────────────────────────────────────
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DOWS   = ["S","M","T","W","T","F","S"];
function pad2(n) { return String(n).padStart(2,"0"); }
function toDS(y,m,d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }

function MiniCal({ view, onNav, dataDates, selectedDate, onPick }) {
  const { y, m } = view;
  const first = new Date(y,m,1).getDay();
  const days  = new Date(y,m+1,0).getDate();
  const prev  = new Date(y,m,0).getDate();

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
          const isSel = !other && ds === selectedDate;
          const hd    = !other && dataDates.has(ds);
          return (
            <div
              key={i}
              onClick={() => !other && onPick(ds)}
              style={{
                ...C.day,
                ...(other ? C.dayOther : {}),
                ...(isSel ? C.daySel  : {}),
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
                  background: isSel ? "#fff" : "#dc2626",
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

function CalPicker({ graph1Date, graph2Date, onGraph1, onGraph2, dataDates }) {
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
          <div style={C.miniLabel}>GRAPH 1</div>
          <MiniCal view={v1} onNav={d => nav(1, d)} dataDates={dataDates} selectedDate={graph1Date} onPick={onGraph1} />
        </div>
        <div>
          <div style={C.miniLabel}>GRAPH 2</div>
          <MiniCal view={v2} onNav={d => nav(2, d)} dataDates={dataDates} selectedDate={graph2Date} onPick={onGraph2} />
        </div>
      </div>
      <div style={{ display:"flex", gap:"14px" }}>
        <div style={C.legItem}><span style={{ ...C.legDot, background:"#dc2626" }} />FTM AVAILABLE</div>
      </div>
    </div>
  );
}

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
  miniLabel: { fontSize:"8px", letterSpacing:"0.14em", color:"#b0aed0", marginBottom:"5px", fontFamily:"'DM Mono',monospace" },
  legItem:   { display:"flex", alignItems:"center", gap:"5px", fontSize:"9px", color:"#a0a0c0", letterSpacing:"0.06em", fontFamily:"'DM Mono',monospace" },
  legDot:    { display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", flexShrink:0 },
};

// ─── BOILER PARAMS TABLE ──────────────────────────────────────
function BoilerParamsTable({ data }) {
  if (!data || Object.keys(data).length === 0)
    return <div style={S.noData}>No boiler parameters recorded for this run.</div>;

  const leftRows = [
    { label: "Main Steam Pressure (Kg/cm²)", l: data.main_steam_pressure_l, r: data.main_steam_pressure_r },
    { label: "Main Steam Flow (TPH)",         l: data.main_steam_flow_l,     r: data.main_steam_flow_r     },
    { label: "Superheat Spray (TPH)",         l: data.superheat_spray_l,     r: data.superheat_spray_r     },
    { label: "Re-heat Spray (TPH)",           l: data.reheat_spray_l,        r: data.reheat_spray_r        },
    { label: "O₂ at APH Inlet (PCR) %",      l: data.o2_aph_inlet_pcr_l,    r: data.o2_aph_inlet_pcr_r    },
    { label: "Wind Box DP - A/B (mmwc)",      l: data.wind_box_dp_l,         r: data.wind_box_dp_r         },
    { label: "Total PA Flow (TPH)",           l: data.total_pa_flow,         r: null,  single: true        },
  ];

  const fgRows = [
    { label: "FG Temp after DPSH (L/R) °C",        l: data.fg_temp_after_dpsh_l, r: data.fg_temp_after_dpsh_r },
    { label: "FG Temp after PSH (L/R) °C",         l: data.fg_temp_after_psh_l,  r: data.fg_temp_after_psh_r  },
    { label: "FG Temp after RH (L/R) °C",          l: data.fg_temp_after_rh_l,   r: data.fg_temp_after_rh_r   },
    { label: "FG Temp after HSH (L/R) °C",         l: data.fg_temp_after_hsh_l,  r: data.fg_temp_after_hsh_r  },
    { label: "FG Temp after Economizer (L/R) °C",  l: data.fg_temp_after_eco_l,  r: data.fg_temp_after_eco_r  },
    { label: "FG Temp after APH (L/R) °C",         l: data.fg_temp_after_aph_l,  r: data.fg_temp_after_aph_r  },
  ];

  const fmt = (v) => (v == null ? "—" : Number(v).toFixed(1));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
      <div>
        <div style={S.subLabel}>BOILER & MILL PARAMETERS</div>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>PARAMETER</th>
                <th style={S.th}>L</th>
                <th style={S.th}>R</th>
              </tr>
            </thead>
            <tbody>
              {leftRows.map(row => (
                <tr key={row.label} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                  <td style={S.td}>{row.label}</td>
                  <td style={{ ...S.td, color:"#4f46e5", fontWeight:500 }}>{fmt(row.l)}</td>
                  <td style={{ ...S.td, color:"#0891b2", fontWeight:500 }}>
                    {row.single ? "—" : fmt(row.r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div style={S.subLabel}>FLUE GAS TEMPERATURES</div>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>PARAMETER</th>
                <th style={S.th}>L</th>
                <th style={S.th}>R</th>
              </tr>
            </thead>
            <tbody>
              {fgRows.map(row => (
                <tr key={row.label} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                  <td style={S.td}>{row.label}</td>
                  <td style={{ ...S.td, color:"#d97706", fontWeight:500 }}>{fmt(row.l)}</td>
                  <td style={{ ...S.td, color:"#7c3aed", fontWeight:500 }}>{fmt(row.r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── COAL MILL TABLE ──────────────────────────────────────────
function CoalMillTable({ data }) {
  if (!data || data.length === 0)
    return <div style={S.noData}>No coal mill parameters recorded for this run.</div>;

  const rows = [
    { key: "coal_flow_tph",    label: "Coal Flow (TPH)"       },
    { key: "pa_flow_tph",      label: "PA Flow (TPH)"         },
    { key: "mill_dp_mmwc",     label: "Mill DP (mmwc)"        },
    { key: "mill_outlet_temp", label: "Mill Outlet Temp (°C)" },
    { key: "mill_current_amp", label: "Mill Current (Amp)"    },
  ];

  const fmt = (v) => (v == null ? "—" : Number(v).toFixed(1));

  return (
    <div>
      <div style={S.subLabel}>COAL MILL PARAMETERS</div>
      <div style={{ overflowX:"auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>PARAMETER</th>
              {data.map(m => (
                <th key={m.mill} style={{ ...S.th, color:"#4f46e5" }}>MILL {m.mill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                <td style={{ ...S.td, color:"#6e6c96", fontWeight:500 }}>{row.label}</td>
                {data.map(m => (
                  <td key={m.mill} style={{ ...S.td, color:"#3a3860" }}>{fmt(m[row.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  // Fixed chart height — identical on every screen size
  const CHART_HEIGHT = 320;

  const [viewMode, setViewMode]                 = useState("runs");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [history, setHistory]                   = useState([]);
  const [selected, setSelected]                 = useState([]);
  const [datasets, setDatasets]                 = useState({});
  const [boilerData, setBoilerData]             = useState({});
  const [coalData, setCoalData]                 = useState({});
  const [uploading, setUploading]               = useState(false);
  const [downloading, setDownloading]           = useState(false);
  const [visibleLines, setVisibleLines]         = useState({ c1:true, c2:true, c3:true, c4:true, avg:true });
  const [activeTab, setActiveTab]               = useState({});

  // Two independent date pickers
  const [graph1Date, setGraph1Date] = useState("");
  const [graph2Date, setGraph2Date] = useState("");
  const [dateError, setDateError]   = useState("");

  const [dataDates, setDataDates]               = useState(new Set());
  const [selectedStation, setSelectedStation]   = useState(null);
  const [selectedUnit, setSelectedUnit]         = useState(null);
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const navigation = useNavigate();

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) => setActiveTab(p => ({ ...p, [id]: tab }));

  useEffect(() => {
    const st = localStorage.getItem("selectedStation");
    const un = localStorage.getItem("selectedUnit");
    if (st) setSelectedStation(JSON.parse(st).name);
    if (un) setSelectedUnit(JSON.parse(un).name);
    fetchMappingDates();
    fetchHistory();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getStationName = () => {
    const st = localStorage.getItem("selectedStation");
    return st ? JSON.parse(st).name || "" : "";
  };

  const getUnitId = () => {
    const un = localStorage.getItem("selectedUnit");
    return un ? JSON.parse(un).id || "" : "";
  };

  const handleLogout = () => {
    localStorage.clear();
    navigation("/");
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId() },
      });
      setHistory(res.data || []);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const fetchRunsForDate = async (date, slotIndex) => {
    if (!date) return;
    try {
      const res = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId(), start_date: date, end_date: date },
      });

      const data = (res.data || []).filter(item =>
        (item.run_date || item.run_timestamp || "").slice(0, 10) === date
      );
      if (data.length === 0) return;

      const item = data[0];

      const [dsRes, boilerRes, coalRes] = await Promise.all([
        axios.get(`${BASE_URL}/history/${item.run_id}`),
        axios.get(`${BASE_URL}/history/${item.run_id}/boiler-params`),
        axios.get(`${BASE_URL}/history/${item.run_id}/coal-mill-params`),
      ]);

      setHistory(prev  => prev.find(r => r.run_id === item.run_id) ? prev : [...prev, item]);
      setDatasets(p    => ({ ...p, [item.run_id]: dsRes.data     }));
      setBoilerData(p  => ({ ...p, [item.run_id]: boilerRes.data }));
      setCoalData(p    => ({ ...p, [item.run_id]: coalRes.data   }));

      setSelected(prev => {
        const next = [...prev];
        next[slotIndex] = item.run_id;
        return next.filter(Boolean);
      });
    } catch (err) {
      console.error("Date fetch error:", err);
    }
  };

  const fetchMappingDates = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/mapping-dates`, {
        params: { station: getStationName(), unit: getUnitId() }
      });
      setDataDates(new Set(res.data.map(r => r.run_date)));
    } catch (e) {
      console.error("Fetch mapping dates error:", e);
    }
  };

  const handleGraph1Pick = (ds) => {
    if (!dataDates.has(ds)) { setDateError("N/A — No data available for selected date"); return; }
    setDateError(""); setGraph1Date(ds); fetchRunsForDate(ds, 0);
  };

  const handleGraph2Pick = (ds) => {
    if (!dataDates.has(ds)) { setDateError("N/A — No data available for selected date"); return; }
    setDateError(""); setGraph2Date(ds); fetchRunsForDate(ds, 1);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("station_id", 1);
      fd.append("unit_id", getUnitId());
      fd.append("uploaded_by", "admin");
      fd.append("notes", "");
      await axios.post(`${BASE_URL}/upload`, fd);
      await fetchMappingDates();
      setShowSuccessModal(true);
      if (window.uploadModalTimer) clearTimeout(window.uploadModalTimer);
      window.uploadModalTimer = setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const stationName = getStationName();
      const un = localStorage.getItem("selectedUnit");
      const unitNumber = un ? JSON.parse(un).id || JSON.parse(un).name || "" : "";
      const response = await fetch(
        `https://91.203.132.34:8000/download-template?location=${encodeURIComponent(stationName)}&unit=${encodeURIComponent(unitNumber)}`
      );
      if (!response.ok) throw new Error("Server error");
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `FTM_template_${stationName}_Unit${unitNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Template download failed:", err);
      alert("Failed to download template. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const deleteRun = async (run_id) => {
    if (!window.confirm("Are you sure you want to delete this run?")) return;
    try {
      await axios.delete(`${BASE_URL}/runs/${run_id}`);
      setHistory(prev    => prev.filter(r => r.run_id !== run_id));
      setSelected(prev   => prev.filter(id => id !== run_id));
      setDatasets(prev   => { const c = { ...prev }; delete c[run_id]; return c; });
      setBoilerData(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setCoalData(prev   => { const c = { ...prev }; delete c[run_id]; return c; });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete run");
    }
  };

  const buildRunData = (ds) =>
    ds.elevation
      .map((el, i) => ({
        elevation: Number(el),
        c1: Number(ds.corner1[i]), c2: Number(ds.corner2[i]),
        c3: Number(ds.corner3[i]), c4: Number(ds.corner4[i]),
        avg: Number(ds.average[i]),
      }))
      .filter(r => r.elevation != null && r.elevation !== 0 && !isNaN(r.elevation));

  const formatRunDate = (rawDate) => {
    if (!rawDate) return "";
    const parsed = new Date(rawDate);
    if (isNaN(parsed)) return rawDate;
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

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
            <span style={{ ...S.ttDot, background: e.color }} />
            <span style={S.ttKey}>{CORNER_LABELS[e.dataKey]}</span>
            <span style={{ ...S.ttNum, color: e.color }}>{Number(e.value).toFixed(1)}°C</span>
          </div>
        ))}
      </div>
    );
  };

  const SIDEBAR_W    = 268;
  const MAIN_PADDING = 16;
  const GAP          = 12;

  return (
    <div style={{ background:"#f0eff8", minHeight:"100vh" }}>

      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={S.hamburger}>
              {[0,1,2].map(i => <span key={i} style={S.hLine} />)}
            </button>
            <div style={S.logoMark}>
              <img src={img} alt="" style={{ maxWidth:"70%", maxHeight:"70%", objectFit:"contain" }} />
            </div>
            <div>
              <div style={S.brandName}>ABHITECH FURNACE FLAME TEMPERATURE MAPPING</div>
              <div style={S.brandTag}>FURNACE FLAME TEMPERATURE MAPPING SYSTEM</div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"24px" }}>
            {selectedStation && selectedUnit && (
              <div style={{ textAlign:"right" }}>
                <div style={S.suLabel}>STATION · UNIT</div>
                <div style={S.suVal}>{selectedStation} · {selectedUnit}</div>
              </div>
            )}
            <button onClick={handleLogout} style={S.logoutButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              LOGOUT
            </button>
          </div>

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
          <div style={S.sideSection}>
            <div style={S.secLabel}>INGEST DATA</div>
            <label style={S.uploadBtn}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 4l3-3 3 3M2 11h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {uploading ? "UPLOADING…" : "UPLOAD EXCEL"}
              <input type="file" onChange={handleUpload} accept=".xlsx" style={{ display:"none" }} />
            </label>
            <button onClick={handleDownloadTemplate} disabled={downloading} style={S.downloadBtn}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {downloading ? "DOWNLOADING…" : "DOWNLOAD TEMPLATE"}
            </button>
          </div>

          <div style={S.sideSection}>
            <div style={S.secLabel}>FILTER BY DATE</div>
            <CalPicker
              graph1Date={graph1Date}
              graph2Date={graph2Date}
              dataDates={dataDates}
              onGraph1={handleGraph1Pick}
              onGraph2={handleGraph2Pick}
            />
            {dateError && (
              <div style={{ marginTop:"8px", color:"#dc2626", fontSize:"10px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em" }}>
                {dateError}
              </div>
            )}
          </div>

          <div style={{ ...S.sideSection, borderBottom:"none", flex:1, overflowY:"auto" }}>
            <div style={S.sideSection}>
              <div style={S.secLabel}>NAVIGATION</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <button
                  onClick={() => setViewMode("runs")}
                  style={{ ...S.navBtn, ...(viewMode === "runs" ? S.navBtnActive : {}) }}
                >
                  RUN ARCHIVE
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{
          flex: 1,
          marginLeft: sidebarOpen ? SIDEBAR_W : 0,
          transition: "margin-left 0.3s ease",
          padding: `${MAIN_PADDING}px`,
          minHeight: "calc(100vh - 56px)",
          boxSizing: "border-box",
          // Allow horizontal scroll on very tiny screens rather than breaking layout
          overflowX: "auto",
        }}>

          {/*
            ── ALWAYS 2 EQUAL COLUMNS ──────────────────────────────────
            gridTemplateColumns: "1fr 1fr" with minmax(0,1fr) prevents
            content from blowing out the column. On any screen size the
            two panels share the available space equally and shrink together.
            A minimum column width of 220px triggers horizontal scroll
            instead of crushing the content unreadably small.
          */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px,1fr) minmax(220px,1fr)",
            gap: `${GAP}px`,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}>
            {[0, 1].map(slotIdx => {
              const id      = selected[slotIdx];
              const dataset = id ? datasets[id] : null;

              const graphLabel = slotIdx === 0 ? "GRAPH 1" : "GRAPH 2";
              const accent     = slotIdx === 0 ? "#4f46e5" : "#d97706";

              // ── Empty placeholder ──
              if (!id || !dataset) {
                return (
                  <section
                    key={`empty-${slotIdx}`}
                    style={{
                      ...S.runSection,
                      minHeight: "180px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: "10px",
                      opacity: 0.45,
                    }}
                  >
                    <div style={{ width:"3px", height:"28px", background:accent, borderRadius:"2px" }} />
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:accent }}>
                      {graphLabel}
                    </div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", letterSpacing:"0.2em", color:"#c8c6e0" }}>
                      SELECT A DATE
                    </div>
                  </section>
                );
              }

              // ── Populated panel ──
              const runData       = buildRunData(dataset);
              const allElevations = [...new Set(runData.map(r => r.elevation))].sort((a, b) => a - b);
              const minElevation  = allElevations[0];
              const maxElevation  = allElevations[allElevations.length - 1];

              const visibleKeys = Object.keys(COLORS).filter(k => visibleLines[k]);
              const xValues     = runData.flatMap(r => visibleKeys.map(key => Number(r[key]) || 0));
              const xMin        = xValues.length ? Math.min(...xValues) : 0;
              const xMax        = xValues.length ? Math.max(...xValues) : 100;
              const xPadding    = Math.max(10, (xMax - xMin) * 0.08);

              const temps   = runData.map(r => r.avg);
              const maxTemp = Math.max(...temps);
              const minTemp = Math.min(...temps);
              const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

              const runMeta      = history.find(r => r.run_id === id) || {};
              const runTitleDate = formatRunDate(runMeta.run_date || dataset.run_date || runMeta.run_timestamp);
              const runSubtitle  = dataset.filename || runMeta.run_date || `RUN ${id}`;

              return (
                <section key={id} style={{ ...S.runSection, minWidth: 0 }}>
                  {/* Header */}
                  <div style={S.runHeader}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                        <div style={{ width:"3px", height:"32px", background:accent, borderRadius:"2px", flexShrink:0 }} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:accent, marginBottom:"2px" }}>
                            {graphLabel}
                          </div>
                          <div style={{ ...S.runTitle, color:"#1e1c3a" }}>{runTitleDate}</div>
                          <div style={S.runSub}>{runSubtitle}</div>
                        </div>
                      </div>
                      <button onClick={() => deleteRun(id)} style={S.deleteBtn} title="Delete this run">
                        DELETE
                      </button>
                    </div>

                    {/* KPI row — always 4 equal columns */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1px", marginTop:"10px" }}>
                      {[
                        { l:"MAX",    v:`${maxTemp.toFixed(0)}°C`, c:"#dc2626" },
                        { l:"MIN",    v:`${minTemp.toFixed(0)}°C`, c:"#0891b2" },
                        { l:"AVG",    v:`${avgTemp}°C`,            c:"#d97706" },
                        { l:"LEVELS", v: runData.length,           c:"#6e6c96" },
                      ].map(kpi => (
                        <div key={kpi.l} style={S.kpiCard}>
                          <div style={{ ...S.kpiVal, color:kpi.c }}>{kpi.v}</div>
                          <div style={S.kpiLbl}>{kpi.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div style={S.tabBar}>
                    {[
                      { k:"graph",  l:"GRAPH"        },
                      { k:"raw",    l:"RAW DATA"      },
                      { k:"boiler", l:"BOILER PARAMS" },
                      { k:"coal",   l:"COAL MILLS"    },
                    ].map(({ k, l }) => (
                      <button
                        key={k}
                        onClick={() => setTab(id, k)}
                        style={{ ...S.tabBtn, ...(getTab(id) === k ? S.tabActive : {}) }}
                      >{l}</button>
                    ))}
                  </div>

                  {/* Graph tab */}
                  {getTab(id) === "graph" && (
                    <div style={S.chartPanel}>
                      <div style={S.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</div>
                      {/*
                        Fixed pixel height — same value (CHART_HEIGHT) on every screen.
                        ResponsiveContainer width="100%" fills the column naturally.
                      */}
                      <div style={{ width:"100%", height: CHART_HEIGHT }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={runData} layout="vertical">
                            <CartesianGrid strokeDasharray="2 8" stroke="#e8e6f4" vertical />
                            <YAxis
                              dataKey="elevation"
                              type="number"
                              domain={[minElevation, maxElevation]}
                              ticks={allElevations}
                              interval={0}
                              reversed
                              width={44}
                              tick={{ fill:"#a0a0c0", fontSize:9, fontFamily:"'DM Mono'" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <XAxis
                              type="number"
                              domain={[xMin - xPadding, xMax + xPadding]}
                              tick={{ fill:"#a0a0c0", fontSize:9, fontFamily:"'DM Mono'" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {visibleLines.c1  && <Line type="monotone" dataKey="c1"  stroke={COLORS.c1}  dot={false} strokeWidth={2} />}
                            {visibleLines.c2  && <Line type="monotone" dataKey="c2"  stroke={COLORS.c2}  dot={false} strokeWidth={2} />}
                            {visibleLines.c3  && <Line type="monotone" dataKey="c3"  stroke={COLORS.c3}  dot={false} strokeWidth={2} />}
                            {visibleLines.c4  && <Line type="monotone" dataKey="c4"  stroke={COLORS.c4}  dot={false} strokeWidth={2} />}
                            {visibleLines.avg && <Line type="monotone" dataKey="avg" stroke={COLORS.avg} dot={false} strokeWidth={3} />}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
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

                  {/* Raw data tab */}
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
                            {runData.map((row, i) => (
                              <tr key={i} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                                <td style={S.td}>{row.elevation}m</td>
                                <td style={S.td}>{row.c1}</td>
                                <td style={S.td}>{row.c2}</td>
                                <td style={S.td}>{row.c3}</td>
                                <td style={S.td}>{row.c4}</td>
                                <td style={{ ...S.td, color:"#d97706", fontWeight:500 }}>{row.avg}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Boiler tab */}
                  {getTab(id) === "boiler" && (
                    <div style={S.tablePanel}>
                      <div style={S.chartLabel}>BOILER & MILL PARAMETERS</div>
                      <BoilerParamsTable data={boilerData[id]} />
                    </div>
                  )}

                  {/* Coal tab */}
                  {getTab(id) === "coal" && (
                    <div style={S.tablePanel}>
                      <div style={S.chartLabel}>COAL MILL PARAMETERS</div>
                      <CoalMillTable data={coalData[id]} />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </main>
      </div>

      {showSuccessModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalIcon}>✓</div>
            <div style={S.modalTitle}>UPLOAD SUCCESSFUL</div>
            <div style={S.modalText}>Your file has been processed and added to the run archive.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const S = {
  modalOverlay: {
    position:"fixed", top:0, left:0, right:0, bottom:0,
    background:"rgba(20, 18, 40, 0.4)", backdropFilter:"blur(6px)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:100,
  },
  modal:      { width:"90%", maxWidth:"360px", padding:"24px" },
  modalIcon:  { width:"50px", height:"50px", borderRadius:"50%", background:"#16a34a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto 12px" },
  modalTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.1em", color:"#16a34a" },
  modalText:  { fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#6e6c96", marginTop:"8px", letterSpacing:"0.05em" },

  header:      { background:"#ffffff", borderBottom:"1px solid #e8e6f4", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 0 rgba(79,70,229,0.06)" },
  hamburger:   { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", gap:"4px", padding:"4px" },
  headerInner: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", flexWrap:"wrap" },
  hLine:       { display:"block", width:"18px", height:"1.5px", background:"#9896c0" },
  logoMark:    { width:"36px", height:"36px", border:"1px solid #e2e1f0", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5fb", flexShrink:0 },
  brandName:   { fontSize:"clamp(10px, 1.4vw, 17px)", fontWeight:"600" },
  brandTag:    { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0", marginTop:"3px" },
  suLabel:     { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.18em", color:"#b0aed0" },
  suVal:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5", letterSpacing:"0.08em" },
  statsRow:    { display:"flex", alignItems:"center", gap:"20px", marginLeft:"auto" },
  statItem:    { display:"flex", alignItems:"center", gap:"6px" },
  statN:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#4f46e5", lineHeight:1 },
  statL:       { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.15em", color:"#b0aed0" },

  logoutButton: { display:"flex", alignItems:"center", gap:"8px", padding:"8px 14px", background:"#dc2626", color:"#ffffff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"600", letterSpacing:"0.5px", flexShrink:0 },

  sidebar:     { background:"#ffffff", borderRight:"1px solid #e8e6f4", position:"fixed", left:0, top:"56px", bottom:0, overflowY:"auto", transition:"transform 0.3s ease", zIndex:1000, width:"260px" },
  sideSection: { padding:"16px 14px", borderBottom:"1px solid #f0eef8" },
  secLabel:    { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.28em", color:"#c8c6e0", marginBottom:"10px", paddingTop:"2px" },
  uploadBtn:   { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#eeeeff", border:"none", borderRadius:"6px", color:"#4f46e5", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", cursor:"pointer", marginBottom:"8px" },
  downloadBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#f0fdf4", border:"none", borderRadius:"6px", color:"#16a34a", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", cursor:"pointer", boxSizing:"border-box" },

  runSection:  { background:"#ffffff", border:"1px solid #e8e6f4", borderRadius:"10px", overflow:"hidden" },
  runHeader:   { padding:"12px 14px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  runTitle:    { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(12px,1.1vw,16px)", letterSpacing:"0.04em", color:"#1e1c3a" },
  runSub:      { fontFamily:"'DM Mono',monospace", fontSize:"8px", color:"#c8c6e0", marginTop:"3px", letterSpacing:"0.06em" },
  kpiCard:     { background:"#f5f4ff", padding:"7px 4px", textAlign:"center", borderRadius:"4px" },
  kpiVal:      { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(12px,1vw,15px)", letterSpacing:"0.05em", lineHeight:1 },
  kpiLbl:      { fontFamily:"'DM Mono',monospace", fontSize:"7px", letterSpacing:"0.15em", color:"#b0aed0", marginTop:"3px" },

  tabBar:    { display:"flex", gap:"3px", padding:"8px 10px", borderBottom:"1px solid #f0eef8", background:"#faf9ff", flexWrap:"wrap" },
  tabBtn:    { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.08em", padding:"4px 7px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0" },
  tabActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },
  deleteBtn: { background:"#fff", border:"1px solid #f0eef8", color:"#dc2626", padding:"5px 9px", borderRadius:"6px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.1em", flexShrink:0 },

  chartPanel: { padding:"14px", background:"#ffffff" },
  chartLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#c8c6e0", marginBottom:"10px" },
  filterBar:  { display:"flex", gap:"4px", marginTop:"10px", flexWrap:"wrap" },
  filterBtn:  { border:"0.5px solid", padding:"3px 7px", fontSize:"8px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.07em", cursor:"pointer", borderRadius:"4px" },

  tablePanel: { padding:"14px", background:"#ffffff" },
  subLabel:   { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#c8c6e0", marginBottom:"10px" },
  table:      { width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace", fontSize:"10px" },
  th:         { padding:"6px 8px", textAlign:"left", fontSize:"8px", letterSpacing:"0.15em", color:"#c8c6e0", borderBottom:"1px solid #f0eef8", fontWeight:400 },
  td:         { padding:"6px 8px", color:"#6e6c96" },
  noData:     { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", padding:"16px 0", letterSpacing:"0.08em" },

  tooltip: { background:"#ffffff", border:"1px solid #e8e6f4", padding:"10px 12px", minWidth:"150px", borderRadius:"6px", boxShadow:"0 4px 20px rgba(79,70,229,0.08)" },
  ttHead:  { display:"flex", justifyContent:"space-between", marginBottom:"6px", paddingBottom:"6px", borderBottom:"1px solid #f0eef8" },
  ttLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0" },
  ttVal:   { fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:"#4f46e5" },
  ttRow:   { display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px" },
  ttDot:   { width:"5px", height:"5px", borderRadius:"50%", flexShrink:0 },
  ttKey:   { fontFamily:"'DM Mono',monospace", fontSize:"8px", color:"#b0aed0", flex:1 },
  ttNum:   { fontFamily:"'DM Mono',monospace", fontSize:"9px", fontWeight:"500" },

  navBtn:       { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"7px 12px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0", textAlign:"left" },
  navBtnActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },

  runCard:        { display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"6px", cursor:"pointer", border:"0.5px solid transparent", position:"relative", opacity:0.6 },
  runCardActive:  { background:"#f5f4ff", borderColor:"#c7c4f8" },
  runCheck:       { width:"14px", height:"14px", borderRadius:"3px", border:"0.5px solid #d4d2e8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:"#fff" },
  runCheckActive: { background:"#4f46e5", borderColor:"#4f46e5" },
  runName:        { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#3a3860", letterSpacing:"0.04em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  runDate:        { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#c8c6e0", marginTop:"2px" },
  runIdx:         { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", letterSpacing:"0.1em" },
};
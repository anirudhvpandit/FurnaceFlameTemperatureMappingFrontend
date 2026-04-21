import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";
import { useNavigate, useNavigation } from "react-router-dom";

const BASE_URL = "https://91.203.132.34:8000";

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

// ─── WINDOW HEIGHT HOOK ───────────────────────────────────────
function useWindowHeight() {
  const [height, setHeight] = useState(window.innerHeight);
  useEffect(() => {
    const handle = () => setHeight(window.innerHeight);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return height;
}

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
                ...(r === "sel"     ? C.daySel  : {}),
                ...(r === "inrange" ? C.dayRange : {}),
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
  dayRange:  { background:"#eeeeff", color:"#4f46e5" },
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
    { key: "coal_flow_tph",    label: "Coal Flow (TPH)"      },
    { key: "pa_flow_tph",      label: "PA Flow (TPH)"        },
    { key: "mill_dp_mmwc",     label: "Mill DP (mmwc)"       },
    { key: "mill_outlet_temp", label: "Mill Outlet Temp (°C)" },
    { key: "mill_current_amp", label: "Mill Current (Amp)"   },
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
  const windowHeight = useWindowHeight();

  const HEADER_H    = 56;
  const PADDING_H   = 40;
  const CARD_CHROME = 170;
  const availableHeight = windowHeight - HEADER_H - PADDING_H - CARD_CHROME;
  const chartHeight = Math.max(220, Math.min(520, availableHeight));

  const [viewMode, setViewMode] = useState("runs");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [history, setHistory]         = useState([]);
  const [selected, setSelected]       = useState([]);
  const [datasets, setDatasets]       = useState({});
  const [boilerData, setBoilerData]   = useState({});
  const [coalData, setCoalData]       = useState({});
  const [uploading, setUploading]     = useState(false);
  const [visibleLines, setVisibleLines] = useState({ c1:true, c2:true, c3:true, c4:true, avg:true });
  const [activeTab, setActiveTab]     = useState({});
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [dataDates, setDataDates]     = useState(new Set());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedUnit, setSelectedUnit]       = useState(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [dateError, setDateError]     = useState("");
  const navigation = useNavigate();

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) => setActiveTab(p => ({ ...p, [id]: tab }));

  useEffect(() => {
    const st = localStorage.getItem("selectedStation");
    const un = localStorage.getItem("selectedUnit");

    if (st) {
      const parsedStation = JSON.parse(st);
      setSelectedStation(parsedStation.name);
    }

    if (un) {
      const parsedUnit = JSON.parse(un);
      setSelectedUnit(parsedUnit.name);
    }

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

  const fetchHistory = async () => {
    try {
      let st = localStorage.getItem("selectedStation");
  let un = localStorage.getItem("selectedUnit");
  let user = localStorage.getItem("username");

  if (st) {
    console.log(st);
    
    const parsedStation = JSON.parse(st);
    console.log(parsedStation);
     st = parsedStation.name
    
  }


  if (un) {
    console.log(un);
    
    const parsedUnit = JSON.parse(un);
    un = parsedUnit.id
    
  }
      console.log("st",st);
      
      const res = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: user, unit_id: un },
      });
      console.log("HISTORY:", res.data);
      setHistory(res.data || []);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    if (startDate || endDate) fetchHistoryByDate();
  }, [startDate, endDate]);

  const fetchMappingDates = async () => {
    try {
      const location = localStorage.getItem("username");
      const unit = localStorage.getItem("selectedUnit");
      let st = localStorage.getItem("selectedStation");
  let un = localStorage.getItem("selectedUnit");
  let user = localStorage.getItem("username");

  if (st) {
    console.log(st);
    
    const parsedStation = JSON.parse(st);
    console.log(parsedStation);
     st = parsedStation.name
    
  }


  if (un) {
    console.log(un);
    
    const parsedUnit = JSON.parse(un);
    un = parsedUnit.id
    
  }
      const res = await axios.get(`${BASE_URL}/mapping-dates`, { params:{ station:location, unit: un} });
      setDataDates(new Set(res.data.map(r => r.run_date)));
    } catch (e) { console.error(e); }
  };

  const fetchHistoryByDate = async () => {
    try {
      console.log(selectedStation,selectedUnit);
      let st = localStorage.getItem("selectedStation");
  let un = localStorage.getItem("selectedUnit");
  let user = localStorage.getItem("username");

  if (st) {
    console.log(st);
    
    const parsedStation = JSON.parse(st);
    console.log(parsedStation);
     st = parsedStation.name
    
    setSelectedStation(user); // or whole object if needed
  }


  if (un) {
    console.log(un);
    
    const parsedUnit = JSON.parse(un);
    setSelectedUnit(parsedUnit.id);
    console.log(parsedUnit);
    un = parsedUnit.id
    
  }
      const res = await axios.get(`${BASE_URL}/history`, {
        params: {
          station_id:user ,
          unit_id: un,
          start_date: startDate || null,
          end_date: endDate || null,
        },
      });

      let data = res.data || [];

      if (startDate || endDate) {
        data = data.filter(item => {
          const d = (item.run_date || item.run_timestamp || "").slice(0, 10);
          if (startDate && endDate) return d === startDate || d === endDate;
          if (startDate) return d === startDate;
          if (endDate) return d === endDate;
          return true;
        });
      }

      setHistory(data);
      const ids = data.map(r => r.run_id);
      setSelected(ids);

      const [datasetsRes, boilerRes, coalRes] = await Promise.all([
        Promise.all(data.map(item => axios.get(`${BASE_URL}/history/${item.run_id}`))),
        Promise.all(data.map(item => axios.get(`${BASE_URL}/history/${item.run_id}/boiler-params`))),
        Promise.all(data.map(item => axios.get(`${BASE_URL}/history/${item.run_id}/coal-mill-params`))),
      ]);

      const newDatasets = {}, newBoiler = {}, newCoal = {};
      data.forEach((item, i) => {
        newDatasets[item.run_id] = datasetsRes[i].data;
        newBoiler[item.run_id]   = boilerRes[i].data;
        newCoal[item.run_id]     = coalRes[i].data;
      });

      setDatasets(newDatasets);
      setBoilerData(newBoiler);
      setCoalData(newCoal);
    } catch (err) {
      console.error("Filtered fetch error:", err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];

    let st = localStorage.getItem("selectedStation");
  let un = localStorage.getItem("selectedUnit");
  let user = localStorage.getItem("username");

  if (st) {
    console.log(st);
    
    const parsedStation = JSON.parse(st);
    console.log(parsedStation);
     st = parsedStation.name
    
  }


  if (un) {
    console.log(un);
    
    const parsedUnit = JSON.parse(un);
    un = parsedUnit.id
    
  }
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("station_id", 1);
      fd.append("unit_id", un);
      fd.append("uploaded_by", "admin");
      fd.append("notes", "");
      fd.append
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

  const deleteRun = async (run_id) => {
    if (!window.confirm("Are you sure you want to delete this run?")) return;
    try {
      await axios.delete(`${BASE_URL}/runs/${run_id}`);
      setHistory(prev => prev.filter(r => r.run_id !== run_id));
      setSelected(prev => prev.filter(id => id !== run_id));
      setDatasets(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setBoilerData(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setCoalData(prev => { const c = { ...prev }; delete c[run_id]; return c; });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete run");
    }
  };

  const toggleSelection = async (item) => {
    if (selected.includes(item.run_id)) {
      setSelected(p => p.filter(id => id !== item.run_id));
      return;
    }
    const promises = [];
    if (!datasets[item.run_id])
      promises.push(axios.get(`${BASE_URL}/history/${item.run_id}`).then(res => setDatasets(p => ({ ...p, [item.run_id]: res.data }))));
    if (!boilerData[item.run_id])
      promises.push(axios.get(`${BASE_URL}/history/${item.run_id}/boiler-params`).then(res => setBoilerData(p => ({ ...p, [item.run_id]: res.data }))));
    if (!coalData[item.run_id])
      promises.push(axios.get(`${BASE_URL}/history/${item.run_id}/coal-mill-params`).then(res => setCoalData(p => ({ ...p, [item.run_id]: res.data }))));
    await Promise.all(promises);
    setSelected(p => [...p, item.run_id]);
  };

  const buildRunData = (ds) =>
    ds.elevation
      .map((el,i) => ({
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
              <div style={S.suVal}>{selectedStation} · {selectedUnit}</div>
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

          <div style={S.sideSection}>
            <div style={S.secLabel}>FILTER BY DATE</div>
            <CalPicker
              startDate={startDate}
              endDate={endDate}
              dataDates={dataDates}
              onStart={(ds) => {
                if (!dataDates.has(ds)) { setDateError("N/A — No data available for selected date"); return; }
                setDateError(""); setStartDate(ds);
              }}
              onEnd={(ds) => {
                if (!dataDates.has(ds)) { setDateError("N/A — No data available for selected date"); return; }
                setDateError(""); setEndDate(ds);
              }}
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
                <button onClick={() => navigation("/event-log")}>
                  EVENT LOG
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{
          flex: 1,
          marginLeft: sidebarOpen && window.innerWidth > 768 ? SIDEBAR_W : 0,
          transition: "margin-left 0.3s ease",
          padding: "clamp(12px, 2vw, 20px)",
          minHeight: "calc(100vh - 56px)",
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
              console.log("dataset",dataset);
              
              const runData = buildRunData(dataset);

              // ── KEY CHANGE: deduplicated, sorted list of every elevation value ──
              const allElevations = [...new Set(runData.map(r => r.elevation))].sort((a, b) => a - b);
              const minElevation  = allElevations[0];
              const maxElevation  = allElevations[allElevations.length - 1];

              const visibleKeys = Object.keys(COLORS).filter(k => visibleLines[k]);
              const xValues = runData.flatMap(r => visibleKeys.map(key => Number(r[key]) || 0));
              const xMin = xValues.length ? Math.min(...xValues) : 0;
              const xMax = xValues.length ? Math.max(...xValues) : 100;
              const xPadding = Math.max(10, (xMax - xMin) * 0.08);

              const temps   = runData.map(r => r.avg);
              const maxTemp = Math.max(...temps);
              const minTemp = Math.min(...temps);
              const avgTemp = (temps.reduce((a,b) => a+b,0) / temps.length).toFixed(1);
              const topRow  = runData.length ? runData.reduce((a,b) => b.elevation > a.elevation ? b : a) : null;
              const botRow  = runData.length ? runData.reduce((a,b) => b.elevation < a.elevation ? b : a) : null;

              const accents = ["#4f46e5","#d97706","#0891b2","#7c3aed","#dc2626"];
              const accent  = accents[runIdx % accents.length];
              const runMeta = history.find(r => r.run_id === id) || {};
              const runTitleDate = formatRunDate(runMeta.run_date || dataset.run_date || runMeta.run_timestamp);
              const runSubtitle = dataset.filename || runMeta.run_date || `RUN ${id}`;

              return (
                <section key={id} style={S.runSection}>
                  <div style={S.runHeader}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                        <div style={{ width:"3px", height:"36px", background:accent, borderRadius:"2px", flexShrink:0 }} />
                        <div>
                          <div style={{ ...S.runTitle, color:"#1e1c3a" }}>
                            {runTitleDate}
                          </div>
                          <div style={S.runSub}>{runSubtitle}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteRun(id)}
                        style={S.deleteBtn}
                        title="Delete this run"
                      >
                        DELETE
                      </button>
                    </div>
                    <div style={S.kpiRow}>
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

                  {getTab(id) === "graph" && (
                    <div style={{ ...S.chartPanel, maxHeight: "62vh" }}>
                      <div style={S.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</div>
                      <ResponsiveContainer width="100%" height={Math.min(chartHeight, windowHeight * 0.6)}>
                        <LineChart data={runData} layout="vertical">
                          <CartesianGrid strokeDasharray="2 8" stroke="#e8e6f4" vertical />

                          {/*
                            ── KEY CHANGES ON YAxis ────────────────────────────────
                            ticks={allElevations}  passes every unique elevation
                            interval={0}           forces ALL ticks to render,
                                                   Recharts won't skip any
                            width={48}             widens the axis so labels
                                                   don't get clipped
                            ────────────────────────────────────────────────────────
                          */}
                          <YAxis
                            dataKey="elevation"
                            type="number"
                            domain={[minElevation, maxElevation]}
                            ticks={allElevations}
                            interval={0}
                            reversed
                            width={48}
                            tick={{ fill:"#a0a0c0", fontSize:10, fontFamily:"'DM Mono'" }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <XAxis
                            type="number"
                            domain={[xMin - xPadding, xMax + xPadding]}
                            tick={{ fill:"#a0a0c0", fontSize:10, fontFamily:"'DM Mono'" }}
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
                            {runData.map((row,i) => (
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

                  {getTab(id) === "boiler" && (
                    <div style={S.tablePanel}>
                      <div style={S.chartLabel}>BOILER & MILL PARAMETERS</div>
                      <BoilerParamsTable data={boilerData[id]} />
                    </div>
                  )}

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
            <div style={S.modalText}>
              Your file has been processed and added to the run archive.
            </div>
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
  modalIcon:  {
    width:"50px", height:"50px", borderRadius:"50%", background:"#16a34a",
    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:"24px", margin:"0 auto 12px",
  },
  modalTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.1em", color:"#16a34a" },
  modalText:  { fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#6e6c96", marginTop:"8px", letterSpacing:"0.05em" },

  header:      { background:"#ffffff", borderBottom:"1px solid #e8e6f4", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 0 rgba(79,70,229,0.06)" },
  hamburger:   { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", gap:"4px", padding:"4px" },
  headerInner: { display:"flex", alignItems:"center", gap:"16px", padding:"10px 20px", flexWrap:"wrap", justifyContent:"space-between" },
  hLine:       { display:"block", width:"18px", height:"1.5px", background:"#9896c0" },
  logoMark:    { width:"36px", height:"36px", border:"1px solid #e2e1f0", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5fb", flexShrink:0 },
  brandName:   { fontSize:"clamp(12px, 2vw, 18px)" },
  brandTag:    { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0", marginTop:"3px" },
  suLabel:     { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.18em", color:"#b0aed0" },
  suVal:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5", letterSpacing:"0.08em" },
  statsRow:    { display:"flex", alignItems:"center", gap:"20px", marginLeft:"auto" },
  statItem:    { display:"flex", alignItems:"center", gap:"6px" },
  statN:       { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#4f46e5", lineHeight:1 },
  statL:       { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.15em", color:"#b0aed0" },

  sideSection: { padding:"16px 14px", borderBottom:"1px solid #f0eef8" },
  sidebar: {
    background:"#ffffff", borderRight:"1px solid #e8e6f4",
    position:"fixed", left:0, top:"56px", bottom:0,
    overflowY:"auto", transition:"transform 0.3s ease", zIndex:1000, width:"260px",
  },
  secLabel:  { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.28em", color:"#c8c6e0", marginBottom:"10px", paddingTop:"2px" },
  uploadBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#eeeeff", border:"none", borderRadius:"6px", color:"#4f46e5", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", cursor:"pointer" },

  runCard:        { display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"6px", cursor:"pointer", border:"0.5px solid transparent", position:"relative", opacity:0.6 },
  runCardActive:  { background:"#f5f4ff", borderColor:"#c7c4f8" },
  runCheck:       { width:"14px", height:"14px", borderRadius:"3px", border:"0.5px solid #d4d2e8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:"#fff" },
  runCheckActive: { background:"#4f46e5", borderColor:"#4f46e5" },
  runName:        { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#3a3860", letterSpacing:"0.04em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  runDate:        { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#c8c6e0", marginTop:"2px" },
  runIdx:         { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", letterSpacing:"0.1em" },

  runSection:  { background:"#ffffff", border:"1px solid #e8e6f4", borderRadius:"10px", overflow:"hidden" },
  runHeader:   { padding:"16px 20px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  runTitle:    { fontSize:"clamp(12px, 1.5vw, 18px)" },
  runSub:      { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#c8c6e0", marginTop:"4px", letterSpacing:"0.06em" },
  kpiRow:      { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(90px, 1fr))", gap:"1px", marginTop:"12px" },
  kpiCard:     { background:"#f5f4ff", padding:"10px 8px", textAlign:"center", borderRadius:"4px" },
  kpiVal:      { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(13px,1.5vw,17px)", letterSpacing:"0.05em", lineHeight:1 },
  kpiLbl:      { fontFamily:"'DM Mono',monospace", fontSize:"7px", letterSpacing:"0.18em", color:"#b0aed0", marginTop:"4px" },

  tabBar:    { display:"flex", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  tabBtn:    { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"5px 12px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0" },
  tabActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },
  deleteBtn: { background:"#fff", border:"1px solid #f0eef8", color:"#dc2626", padding:"8px 12px", borderRadius:"8px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.12em", minWidth:"90px" },

  chartPanel: { padding:"20px", background:"#ffffff" },
  chartLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:"#c8c6e0", marginBottom:"16px" },
  filterBar:  { display:"flex", gap:"6px", marginTop:"14px", flexWrap:"wrap" },
  filterBtn:  { border:"0.5px solid", padding:"4px 10px", fontSize:"9px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", cursor:"pointer", borderRadius:"4px" },

  tablePanel: { padding:"20px", background:"#ffffff" },
  subLabel:   { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:"#c8c6e0", marginBottom:"12px" },
  table:      { width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace", fontSize:"11px" },
  th:         { padding:"8px 12px", textAlign:"left", fontSize:"8px", letterSpacing:"0.18em", color:"#c8c6e0", borderBottom:"1px solid #f0eef8", fontWeight:400 },
  td:         { padding:"8px 12px", color:"#6e6c96" },
  noData:     { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", padding:"20px 0", letterSpacing:"0.08em" },

  tooltip: { background:"#ffffff", border:"1px solid #e8e6f4", padding:"12px 14px", minWidth:"180px", borderRadius:"6px", boxShadow:"0 4px 20px rgba(79,70,229,0.08)" },
  ttHead:  { display:"flex", justifyContent:"space-between", marginBottom:"8px", paddingBottom:"8px", borderBottom:"1px solid #f0eef8" },
  ttLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0" },
  ttVal:   { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5" },
  ttRow:   { display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" },
  ttDot:   { width:"5px", height:"5px", borderRadius:"50%", flexShrink:0 },
  ttKey:   { fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#b0aed0", flex:1 },
  ttNum:   { fontFamily:"'DM Mono',monospace", fontSize:"10px", fontWeight:"500" },

  navBtn:       { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"7px 12px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0", textAlign:"left" },
  navBtnActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },
};
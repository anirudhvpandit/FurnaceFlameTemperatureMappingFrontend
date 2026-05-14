import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://91.203.132.34:8080";

// ─── INGEST (NO FILE) HELPERS ──────────────────────────────────
const DEFAULT_ELEVATION_COLS = ["Corner 1", "Corner 2", "Corner 3", "Corner 4", "Corner 5", "Corner 6", "Corner 7"];
const DEFAULT_COAL_MILLS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const MAX_MILLS = 10;

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function safeNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function nextCornerLabel(existing) {
  const nums = existing
    .map((c) => (String(c).match(/(\d+)/) ? Number(String(c).match(/(\d+)/)[1]) : null))
    .filter((n) => Number.isFinite(n));
  const next = nums.length ? Math.max(...nums) + 1 : existing.length + 1;
  return `Corner ${next}`;
}

function createEmptyRunDraft({ stationName, unitId }) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    meta: {
      station: stationName || "",
      unit_id: unitId || "",
      run_date: date,
      run_time: time,
      load_mw: "",
      total_coal_flow_tph: "",
      total_air_flow_tph: "",
      burner_tilt_deg: "",
      coal_mills_in_service_count: "",
      coal_mills_in_service: "",
      oil_guns_in_service_count: "",
      oil_guns_in_service: "",
      notes: "",
    },
    elevation: {
      columns: [...DEFAULT_ELEVATION_COLS],
      rows: [
        { elevation_m: "56.4", values: Object.fromEntries(DEFAULT_ELEVATION_COLS.map((c) => [c, ""])) },
      ],
    },
    boiler: {
      main_steam_pressure_l: "", main_steam_pressure_r: "",
      main_steam_flow_l: "", main_steam_flow_r: "",
      superheat_spray_l: "", superheat_spray_r: "",
      reheat_spray_l: "", reheat_spray_r: "",
      o2_aph_inlet_pcr_l: "", o2_aph_inlet_pcr_r: "",
      wind_box_dp_l: "", wind_box_dp_r: "",
      total_pa_flow: "",
      total_fd_fan_flow: "",
      total_pa_to_windbox_flow: "",
    },
    flueGas: {
      fg_temp_after_dpsh_l: "", fg_temp_after_dpsh_r: "",
      fg_temp_after_psh_l: "", fg_temp_after_psh_r: "",
      fg_temp_after_rh_l: "", fg_temp_after_rh_r: "",
      fg_temp_after_hsh_l: "", fg_temp_after_hsh_r: "",
      fg_temp_after_eco_l: "", fg_temp_after_eco_r: "",
      fg_temp_after_aph_l: "", fg_temp_after_aph_r: "",
    },
    coalMills: {
      mills: [...DEFAULT_COAL_MILLS],
      byMill: Object.fromEntries(DEFAULT_COAL_MILLS.map((m) => [m, {
        coal_flow_tph: "",
        pa_flow_tph: "",
        mill_dp_mmwc: "",
        mill_outlet_temp: "",
        mill_current_amp: "",
      }])),
    },
  };
}

function buildUploadPayload(draft) {
  const cols = draft.elevation.columns;
  const cleanRows = (draft.elevation.rows || [])
    .map((r) => {
      const elevation_m = safeNum(r.elevation_m);
      if (elevation_m == null) return null;
      const values = cols.map((c) => safeNum(r.values?.[c]));
      const present = values.filter((v) => v != null);
      const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
      return { elevation_m, values: Object.fromEntries(cols.map((c, i) => [c, values[i]])), average: avg };
    })
    .filter(Boolean);

  const coal = (draft.coalMills.mills || []).map((mill) => ({
    mill,
    coal_flow_tph: safeNum(draft.coalMills.byMill?.[mill]?.coal_flow_tph),
    pa_flow_tph: safeNum(draft.coalMills.byMill?.[mill]?.pa_flow_tph),
    mill_dp_mmwc: safeNum(draft.coalMills.byMill?.[mill]?.mill_dp_mmwc),
    mill_outlet_temp: safeNum(draft.coalMills.byMill?.[mill]?.mill_outlet_temp),
    mill_current_amp: safeNum(draft.coalMills.byMill?.[mill]?.mill_current_amp),
  }));

  return {
    station_id: draft.meta.station || null,
    unit_id: draft.meta.unit_id || null,
    uploaded_by: localStorage.getItem("username") || "admin",
    notes: draft.meta.notes || "",
    run_meta: {
      run_date: draft.meta.run_date || null,
      run_time: draft.meta.run_time || null,
      load_mw: safeNum(draft.meta.load_mw),
      total_coal_flow_tph: safeNum(draft.meta.total_coal_flow_tph),
      total_air_flow_tph: safeNum(draft.meta.total_air_flow_tph),
      burner_tilt_deg: safeNum(draft.meta.burner_tilt_deg),
      coal_mills_in_service_count: safeNum(draft.meta.coal_mills_in_service_count),
      coal_mills_in_service: String(draft.meta.coal_mills_in_service || "").trim() || null,
      oil_guns_in_service_count: safeNum(draft.meta.oil_guns_in_service_count),
      oil_guns_in_service: String(draft.meta.oil_guns_in_service || "").trim() || null,
    },
    elevation_profile: {
      columns: cols,
      rows: cleanRows,
    },
    boiler_params: {
      main_steam_pressure_l: safeNum(draft.boiler.main_steam_pressure_l),
      main_steam_pressure_r: safeNum(draft.boiler.main_steam_pressure_r),
      main_steam_flow_l: safeNum(draft.boiler.main_steam_flow_l),
      main_steam_flow_r: safeNum(draft.boiler.main_steam_flow_r),
      superheat_spray_l: safeNum(draft.boiler.superheat_spray_l),
      superheat_spray_r: safeNum(draft.boiler.superheat_spray_r),
      reheat_spray_l: safeNum(draft.boiler.reheat_spray_l),
      reheat_spray_r: safeNum(draft.boiler.reheat_spray_r),
      o2_aph_inlet_pcr_l: safeNum(draft.boiler.o2_aph_inlet_pcr_l),
      o2_aph_inlet_pcr_r: safeNum(draft.boiler.o2_aph_inlet_pcr_r),
      wind_box_dp_l: safeNum(draft.boiler.wind_box_dp_l),
      wind_box_dp_r: safeNum(draft.boiler.wind_box_dp_r),
      total_pa_flow: safeNum(draft.boiler.total_pa_flow),
      total_fd_fan_flow: safeNum(draft.boiler.total_fd_fan_flow),
      total_pa_to_windbox_flow: safeNum(draft.boiler.total_pa_to_windbox_flow),
    },
    flue_gas_temps: {
      fg_temp_after_dpsh_l: safeNum(draft.flueGas.fg_temp_after_dpsh_l),
      fg_temp_after_dpsh_r: safeNum(draft.flueGas.fg_temp_after_dpsh_r),
      fg_temp_after_psh_l: safeNum(draft.flueGas.fg_temp_after_psh_l),
      fg_temp_after_psh_r: safeNum(draft.flueGas.fg_temp_after_psh_r),
      fg_temp_after_rh_l: safeNum(draft.flueGas.fg_temp_after_rh_l),
      fg_temp_after_rh_r: safeNum(draft.flueGas.fg_temp_after_rh_r),
      fg_temp_after_hsh_l: safeNum(draft.flueGas.fg_temp_after_hsh_l),
      fg_temp_after_hsh_r: safeNum(draft.flueGas.fg_temp_after_hsh_r),
      fg_temp_after_eco_l: safeNum(draft.flueGas.fg_temp_after_eco_l),
      fg_temp_after_eco_r: safeNum(draft.flueGas.fg_temp_after_eco_r),
      fg_temp_after_aph_l: safeNum(draft.flueGas.fg_temp_after_aph_l),
      fg_temp_after_aph_r: safeNum(draft.flueGas.fg_temp_after_aph_r),
    },
    coal_mill_params: coal,
  };
}

// ─── BACKEND EXCEL DOWNLOAD HELPER ────────────────────────────
async function downloadExcelFromBackend(runsArray, fallbackFilename = "FTM_export.xlsx") {
  try {
    const payload = {
      runs: runsArray
    };
    
    const response = await fetch(`${BASE_URL}/generate-excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server error ${response.status}: ${errText}`);
    }

    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    let filename = fallbackFilename;
    
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, "");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

function buildGeneratePayload({ runMeta, dataset, boiler, coal, stationName, unitId }) {
  const cornerKeys = Object.keys(dataset || {})
    .filter((k) => k.match(/^c\d+$/))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const columns = cornerKeys.map((k) => `Corner ${k.replace("c", "")}`);

  const rows = (dataset?.elevation || []).map((el, i) => {
    const values = {};
    cornerKeys.forEach((k) => {
      const v = dataset[k]?.[i];
      values[`Corner ${k.replace("c", "")}`] = v != null ? Number(v) : null;
    });
    const avgRaw = dataset.average?.[i] ?? dataset.avg_val?.[i] ?? dataset.avg?.[i];
    const average = avgRaw != null ? Number(avgRaw) : null;
    return { elevation_m: Number(el), values, average };
  }).filter((r) => !isNaN(r.elevation_m));

  const boiler_params = {};
  const flue_gas_temps = {};
  const bp = boiler || {};
  const boilerKeys = [
    "main_steam_pressure_l", "main_steam_pressure_r",
    "main_steam_flow_l", "main_steam_flow_r",
    "superheat_spray_l", "superheat_spray_r",
    "reheat_spray_l", "reheat_spray_r",
    "o2_aph_inlet_pcr_l", "o2_aph_inlet_pcr_r",
    "wind_box_dp_l", "wind_box_dp_r",
    "total_pa_flow",
  ];
  const flueKeys = [
    "fg_temp_after_dpsh_l", "fg_temp_after_dpsh_r",
    "fg_temp_after_psh_l", "fg_temp_after_psh_r",
    "fg_temp_after_rh_l", "fg_temp_after_rh_r",
    "fg_temp_after_hsh_l", "fg_temp_after_hsh_r",
    "fg_temp_after_eco_l", "fg_temp_after_eco_r",
    "fg_temp_after_aph_l", "fg_temp_after_aph_r",
  ];
  boilerKeys.forEach((k) => { boiler_params[k] = bp[k] ?? null; });
  flueKeys.forEach((k) => { flue_gas_temps[k] = bp[k] ?? null; });

  const coal_mill_params = (Array.isArray(coal) ? coal : []).map((m) => ({
    mill: m.mill,
    coal_flow_tph: m.coal_flow_tph ?? null,
    pa_flow_tph: m.pa_flow_tph ?? null,
    mill_dp_mmwc: m.mill_dp_mmwc ?? null,
    mill_outlet_temp: m.mill_outlet_temp ?? null,
    mill_current_amp: m.mill_current_amp ?? null,
  }));

  const rawDate = runMeta.run_date || runMeta.run_timestamp || "";
  const dateStr = rawDate.slice(0, 10);

  return {
    station: stationName || runMeta.location || "",
    unit_id: unitId,
    run_meta: {
      run_date: dateStr,
      run_time: runMeta.run_time || "",
      load_mw: runMeta.load_mw ?? null,
      total_coal_flow_tph: runMeta.total_coal_flow_tph ?? null,
      total_air_flow_tph: runMeta.total_air_flow_tph ?? null,
      burner_tilt_deg: runMeta.burner_tilt_position ?? runMeta.burner_tilt_deg ?? null,
      coal_mills_in_service_count: runMeta.coal_mills_in_service ?? null,
      coal_mills_in_service: runMeta.coal_mills_in_service_label ?? "",
      oil_guns_in_service_count: runMeta.oil_guns_in_service ?? null,
      oil_guns_in_service: runMeta.oil_guns_in_service_label ?? "",
    },
    elevation_profile: { columns, rows },
    boiler_params,
    flue_gas_temps,
    coal_mill_params,
  };
}

// ─── DESIGN TOKENS ───────────────────────────────────────────
const CORNER_COLORS = [
  "#4f46e5", "#f59e0b", "#06b6d4", "#8b5cf6",
  "#ec4899", "#10b981", "#f97316", "#6366f1",
];

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return size;
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DOWS   = ["S","M","T","W","T","F","S"];
function pad2(n) { return String(n).padStart(2,"0"); }
function toDS(y,m,d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }

function MiniCal({ view, onNav, dataDates, selectedDate, onPick, isAdmin }) {
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
                cursor: (!other && (isAdmin || hd)) ? "pointer" : "default",
                position: "relative",
                opacity: (!other && !hd && !isAdmin) ? 0.4 : 1,
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

function CalPicker({ graph1Date, graph2Date, onGraph1, onGraph2, dataDates, isAdmin }) {
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
          <MiniCal view={v1} onNav={d => nav(1, d)} dataDates={dataDates} selectedDate={graph1Date} onPick={onGraph1} isAdmin={isAdmin} />
        </div>
        <div>
          <div style={C.miniLabel}>GRAPH 2</div>
          <MiniCal view={v2} onNav={d => nav(2, d)} dataDates={dataDates} selectedDate={graph2Date} onPick={onGraph2} isAdmin={isAdmin} />
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

export default function App() {
  const { width: windowWidth } = useWindowSize();
  const isNarrow = windowWidth < 760;
  const isMobileSheet = windowWidth < 1100;

  const CHART_HEIGHT = 320;

  const [viewMode, setViewMode]                 = useState("runs");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showIngestModal, setShowIngestModal]   = useState(false);
  const [showReportModal, setShowReportModal]   = useState(false);
  const [history, setHistory]                   = useState([]);
  const [selected, setSelected]                 = useState([]);
  const [datasets, setDatasets]                 = useState({});
  const [boilerData, setBoilerData]             = useState({});
  const [coalData, setCoalData]                 = useState({});
  const [uploading, setUploading]               = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [runDownloading, setRunDownloading]     = useState({});
  const [visibleLines, setVisibleLines]         = useState({});
  const [activeTab, setActiveTab]               = useState({});
  const [isAdmin, setIsAdmin]                   = useState(false);
  const [userLocation, setUserLocation]         = useState("all");

  const [graph1Date, setGraph1Date] = useState("");
  const [graph2Date, setGraph2Date] = useState("");
  const [dateError, setDateError]   = useState("");

  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate]     = useState("");
  const [reportError, setReportError]       = useState("");

  const [dataDates, setDataDates]             = useState(new Set());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedUnit, setSelectedUnit]       = useState(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const navigation = useNavigate();

  const [ingestTab, setIngestTab] = useState("run");
  const [runDraft, setRunDraft] = useState(() => createEmptyRunDraft({
    stationName: (localStorage.getItem("selectedStation") ? JSON.parse(localStorage.getItem("selectedStation")).name : ""),
    unitId: (localStorage.getItem("selectedUnit") ? JSON.parse(localStorage.getItem("selectedUnit")).id : ""),
  }));

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) => setActiveTab(p => ({ ...p, [id]: tab }));

  const buildRunData = (dataset) => {
    if (!dataset || !dataset.elevation) {
      console.warn("buildRunData: no dataset or no elevation", dataset);
      return [];
    }
    
    const cornerKeys = Object.keys(dataset)
      .filter(k => k.match(/^c\d+$/))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  
    console.log("cornerKeys found:", cornerKeys);
    console.log("elevation array:", dataset.elevation);
  
    const result = dataset.elevation
      .map((el, i) => {
        const elNum = Number(el);
        const point = {
          elevation: elNum,
          avg: (() => {
            const a = dataset.average?.[i] ?? dataset.avg_val?.[i] ?? dataset.avg?.[i];
            return a != null && !isNaN(Number(a)) ? Number(a) : null;
          })(),
        };
        cornerKeys.forEach(k => {
          const v = dataset[k]?.[i];
          point[k] = (v != null && v !== "" && !isNaN(Number(v))) ? Number(v) : null;
        });
        return point;
      })
      // REMOVED the `elevation !== 0` filter — valid elevations could be low numbers
      .filter(r => r.elevation != null && !isNaN(r.elevation));
  
    console.log("buildRunData result:", result);
    return result;
  };

  useEffect(() => {
    const location = localStorage.getItem("location");
    const role = localStorage.getItem("role");
    setIsAdmin(role === "admin");
    setUserLocation(location);
  }, []);

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

  useEffect(() => {
    selected.forEach(runId => {
      const dataset = datasets[runId];
      if (dataset && !visibleLines[runId]) {
        const runData = buildRunData(dataset);
        const existingCorners = Object.keys(runData[0] || {}).filter(k => k.match(/^c\d+$/));
        if (existingCorners.length > 0) {
          setVisibleLines(prev => ({
            ...prev,
            [runId]: {
              ...Object.fromEntries(existingCorners.map(k => [k, true])),
              avg: true,
            },
          }));
        }
      }
    });
  }, [selected, datasets]);

  const getStationName = () => {
    const st = localStorage.getItem("selectedStation");
    return st ? JSON.parse(st).name || "" : "";
  };
  const getUnitId = () => {
    const un = localStorage.getItem("selectedUnit");
    return un ? JSON.parse(un).id || "" : "";
  };
  const getUnitName = () => {
    const un = localStorage.getItem("selectedUnit");
    return un ? JSON.parse(un).name || JSON.parse(un).id || "" : "";
  };

  const handleLogout = () => {
    localStorage.clear();
    navigation("/");
  };

  const openIngest = () => {
    if (!isAdmin) { alert("Only administrators can upload data."); return; }
    setRunDraft(createEmptyRunDraft({ stationName: getStationName(), unitId: getUnitId() }));
    setIngestTab("run");
    setSidebarOpen(false);
    setShowIngestModal(true);
  };

  const fetchHistory = async () => {
    try {
      let x = getUnitId()
      console.log("x", x);
      
      const res = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId() },
      });
      console.log("restdata" , res.data);
      
      setHistory(res.data || []);
    } catch (err) { console.error("History fetch error:", err); }
  };

  const fetchRunsForDate = async (date, slotIndex) => {
    if (!date) return;
    try {
      const res = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId(), start_date: date, end_date: date },
      });
      const data = (res.data || []).filter(item =>
        item.run_date  === date
      );
      if (data.length === 0) return;
      const item = data[0];
      console.log(item.run_id);
      
      const [dsRes, boilerRes, coalRes] = await Promise.all([
        axios.get(`${BASE_URL}/history/${item.run_id}`),
        axios.get(`${BASE_URL}/history/${item.run_id}/boiler-params`),
        axios.get(`${BASE_URL}/history/${item.run_id}/coal-mill-params`),
      ]);
      setHistory(prev => prev.find(r => r.run_id === item.run_id) ? prev : [...prev, item]);
      setDatasets(p => ({ ...p, [item.run_id]: dsRes.data }));
      setBoilerData(p => ({ ...p, [item.run_id]: boilerRes.data }));
      setCoalData(p => ({ ...p, [item.run_id]: coalRes.data }));
      setSelected(prev => {
        const next = [...prev];
        next[slotIndex] = item.run_id;
        return next.filter(Boolean);
      });
    } catch (err) { console.error("Date fetch error:", err); }
  };

  const fetchMappingDates = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/mapping-dates`, {
            params: { station: getStationName(), unit: getUnitId() },
        });
        
        console.log("Raw mapping response:", res.data);
        console.log("Response type:", typeof res.data);
        console.log("Is array?", Array.isArray(res.data));
        
        if (!res.data || !Array.isArray(res.data)) {
            console.error("Invalid response format:", res.data);
            return;
        }
        
        const datesSet = new Set();
        res.data.forEach(item => {
            // Handle both possible field names
            let dateStr = item.run_date || item.run_timestamp;
            
            if (dateStr) {
                // Ensure we only take YYYY-MM-DD part
                let normalizedDate = dateStr;
                if (typeof dateStr === 'string') {
                    normalizedDate = dateStr.split('T')[0].split(' ')[0];
                } else if (dateStr instanceof Date) {
                    normalizedDate = dateStr.toISOString().split('T')[0];
                } else if (typeof dateStr === 'object' && dateStr.$date) {
                    // MongoDB style date
                    normalizedDate = new Date(dateStr.$date).toISOString().split('T')[0];
                }
                
                // Check specifically for April 1st
                if (normalizedDate === '2026-04-01') {
                    console.log("✅ Found April 1st in mapping dates!");
                }
                
                datesSet.add(normalizedDate);
            }
        });
        
        console.log("Final dates set:", Array.from(datesSet).sort());
        console.log("Contains April 1st?", datesSet.has('2026-04-01'));
        
        setDataDates(datesSet);
        
        // Optional: Auto-select April 1st for testing
        if (datesSet.has('2026-04-01')) {
            console.log("April 1st is available in the calendar!");
        }
        
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

  const handleDownloadSingleRun = async (runId) => {
    const dataset  = datasets[runId];
    const runMeta  = history.find(r => r.run_id === runId) || {};
    const boiler   = boilerData[runId];
    const coal     = coalData[runId];

    if (!dataset) { alert("Run data not loaded yet."); return; }

    setRunDownloading(p => ({ ...p, [runId]: true }));
    try {
      const payload = buildGeneratePayload({
        runMeta,
        dataset,
        boiler,
        coal,
        stationName: getStationName(),
        unitId: getUnitId(),
      });
      
      await downloadExcelFromBackend(
        [payload],
        `FTM_${getStationName()}_Unit${getUnitId()}_${(runMeta.run_date || "").slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error("Single run download failed:", err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setRunDownloading(p => ({ ...p, [runId]: false }));
    }
  };

  const handleDownloadReport = async () => {
    setReportError("");
    if (!reportFromDate || !reportToDate) {
      setReportError("Please select both FROM and TO dates."); return;
    }
    if (reportFromDate > reportToDate) {
      setReportError("FROM date must be before or equal to TO date."); return;
    }

    setReportDownloading(true);
    try {
      let x = getUnitId()
      console.log("unit id " , x);
      
      const histRes = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId() },
      });
      const toISO = (raw) => {
        if (!raw) return "";
        const s = String(raw).slice(0, 10);
        if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
        const d = new Date(raw);
        return !isNaN(d) ? d.toISOString().slice(0, 10) : "";
      };
      const runs = (histRes.data || []).filter(item => {
        const d = toISO(item.run_date || item.run_timestamp);
        return d >= reportFromDate && d <= reportToDate;
      });

      if (runs.length === 0) {
        setReportError("No data found for the selected date range.");
        setReportDownloading(false);
        return;
      }

      runs.sort((a, b) => {
        const da = toISO(a.run_date || a.run_timestamp);
        const db = toISO(b.run_date || b.run_timestamp);
        return da.localeCompare(db);
      });

      const runsData = await Promise.all(
        runs.map(async (item) => {
          try {
            const [dsRes, boilerRes, coalRes] = await Promise.all([
              axios.get(`${BASE_URL}/history/${item.run_id}`),
              axios.get(`${BASE_URL}/history/${item.run_id}/boiler-params`),
              axios.get(`${BASE_URL}/history/${item.run_id}/coal-mill-params`),
            ]);
            return { runMeta: item, dataset: dsRes.data, boiler: boilerRes.data, coal: coalRes.data };
          } catch (e) {
            console.error(`Failed run ${item.run_id}`, e);
            return null;
          }
        })
      );
      
      const validRuns = runsData.filter(Boolean);
      if (validRuns.length === 0) {
        setReportError("Failed to fetch run data. Please try again.");
        setReportDownloading(false);
        return;
      }

      const payloads = validRuns.map(({ runMeta, dataset, boiler, coal }) => {
        return buildGeneratePayload({
          runMeta, dataset, boiler, coal,
          stationName: getStationName(),
          unitId: getUnitId(),
        });
      });

      await downloadExcelFromBackend(
        payloads,
        `FTM_${getStationName()}_Unit${getUnitId()}_${reportFromDate}_to_${reportToDate}.xlsx`
      );

      setShowReportModal(false);
      setReportFromDate("");
      setReportToDate("");
    } catch (err) {
      console.error("Report download failed:", err);
      setReportError(`Failed to generate report: ${err.message}`);
    } finally {
      setReportDownloading(false);
    }
  };

  const submitRunDraft = async () => {
    if (!isAdmin) { alert("Only administrators can upload data."); return; }
    const payload = buildUploadPayload(runDraft);
    if (!payload.run_meta?.run_date || !payload.run_meta?.run_time) {
      alert("Please set run date & time."); return;
    }
    if (!payload.elevation_profile?.rows?.length) {
      alert("Please add at least one elevation row with values."); return;
    }
    setUploading(true);
    try {
      await axios.post(`${BASE_URL}/upload-run`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setShowIngestModal(false);
      await fetchMappingDates();
      await fetchHistory();
      setShowSuccessModal(true);
      if (window.uploadModalTimer) clearTimeout(window.uploadModalTimer);
      window.uploadModalTimer = setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err?.response?.data?.detail || err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteRun = async (run_id) => {
    if (!isAdmin) { alert("Only administrators can delete data."); return; }
    if (!window.confirm("Are you sure you want to delete this run?")) return;
    try {
      await axios.delete(`${BASE_URL}/runs/${run_id}`);
      setHistory(prev => prev.filter(r => r.run_id !== run_id));
      setSelected(prev => prev.filter(id => id !== run_id));
      setDatasets(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setBoilerData(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setCoalData(prev => { const c = { ...prev }; delete c[run_id]; return c; });
      setVisibleLines(prev => { const c = { ...prev }; delete c[run_id]; return c; });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete run");
    }
  };

  const formatRunDate = (rawDate) => {
    if (!rawDate) return "";
    // If it's already in YYYY-MM-DD format
    if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = rawDate.split('-');
        return `${day}/${month}/${year}`;
    }
    // Otherwise try parsing
    const parsed = new Date(rawDate);
    if (isNaN(parsed)) return rawDate;
    return parsed.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
};

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={S.tooltip}>
        <div style={S.ttHead}>
          <span style={S.ttLabel}>ELEVATION</span>
          <span style={S.ttVal}>{label}m</span>
        </div>
        {payload.map(e => {
          if (e.value == null) return null;
          const cm = e.dataKey.match(/^c(\d+)$/);
          const lbl = cm ? `Corner ${cm[1]}` : e.dataKey === "avg" ? "Average" : e.dataKey;
          return (
            <div key={e.dataKey} style={S.ttRow}>
              <span style={{ ...S.ttDot, background: e.color }} />
              <span style={S.ttKey}>{lbl}</span>
              <span style={{ ...S.ttNum, color: e.color }}>{Number(e.value).toFixed(1)}°C</span>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  };

  const SIDEBAR_W = 268;
  const MAIN_PADDING = 16;
  const GAP = 12;
  const sidebarEffectiveOpen = sidebarOpen && !showIngestModal;

  return (
    <div style={{ background:"#f0eff8", minHeight:"100vh" }}>

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
            {isAdmin && userLocation === "all" && (
              <div style={S.adminBadge}>👑 ADMIN</div>
            )}
            <button onClick={handleLogout} style={S.logoutButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              LOGOUT
            </button>
          </div>

          <div style={S.statsRow}>
            {[
              { n: history.length, l:"RUNS" },
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
        <aside style={{
          ...S.sidebar,
          width: SIDEBAR_W,
          transform: sidebarEffectiveOpen ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
        }}>
          {isAdmin && (
            <div style={S.sideSection}>
              <div style={S.secLabel}>INGEST DATA</div>
              <button onClick={openIngest} disabled={uploading} style={{ ...S.uploadBtn, cursor: uploading ? "not-allowed" : "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {uploading ? "UPLOADING…" : "CREATE FTM RECORD"}
              </button>
            </div>
          )}

          <div style={S.sideSection}>
            <div style={S.secLabel}>DOWNLOAD REPORT</div>
            <button
              onClick={() => { setShowReportModal(true); setReportError(""); }}
              style={S.downloadBtn}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              DOWNLOAD REPORT
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
              isAdmin={isAdmin}
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

        <main style={{
          flex: 1,
          marginLeft: sidebarEffectiveOpen ? SIDEBAR_W : 0,
          transition: "margin-left 0.3s ease",
          padding: `${MAIN_PADDING}px`,
          minHeight: "calc(100vh - 56px)",
          boxSizing: "border-box",
          overflowX: "auto",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px,1fr) minmax(220px,1fr)",
            gap: `${GAP}px`,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}>
            {[0, 1].map(slotIdx => {
              const id = selected[slotIdx];
              const dataset = id ? datasets[id] : null;
              const graphLabel = slotIdx === 0 ? "GRAPH 1" : "GRAPH 2";
              const accent = slotIdx === 0 ? "#4f46e5" : "#d97706";

              if (!id || !dataset) {
                return (
                  <section key={`empty-${slotIdx}`} style={{ ...S.runSection, minHeight:"180px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"10px", opacity:0.45 }}>
                    <div style={{ width:"3px", height:"28px", background:accent, borderRadius:"2px" }} />
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:accent }}>{graphLabel}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"13px", letterSpacing:"0.2em", color:"#c8c6e0" }}>SELECT A DATE</div>
                  </section>
                );
              }

              const runData = buildRunData(dataset);
              const allElevations = [...new Set(runData.map(r => r.elevation))].sort((a, b) => a - b);
              const minElevation = allElevations[0];
              const maxElevation = allElevations[allElevations.length - 1];

              const allCornerKeys = Object.keys(runData[0] || {})
                .filter(k => k.match(/^c\d+$/))
                .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
              const cornerKeys = allCornerKeys.filter(k =>
                runData.some(p => p[k] !== null && p[k] !== undefined)
              );

              const dynamicColors = {
                ...Object.fromEntries(cornerKeys.map((k, i) => [k, CORNER_COLORS[i % CORNER_COLORS.length]])),
                avg: "#ef4444",
              };
              const dynamicLabels = {
                ...Object.fromEntries(cornerKeys.map(k => [k, `Corner ${k.match(/\d+/)[0]}`])),
                avg: "Average",
              };

              const currentVisibleLines = visibleLines[id] || {
                ...Object.fromEntries(cornerKeys.map(k => [k, true])),
                avg: true,
              };
              const visibleKeys = cornerKeys.filter(k => currentVisibleLines[k]);
              const visibleDataPoints = runData.flatMap(r =>
                visibleKeys.map(k => r[k]).filter(v => v !== null && v !== undefined)
              );
              const xMin = visibleDataPoints.length ? Math.min(...visibleDataPoints) : 0;
              const xMax = visibleDataPoints.length ? Math.max(...visibleDataPoints) : 100;
              const xPadding = Math.max(10, (xMax - xMin) * 0.08);

              const temps = runData.map(r => r.avg);
              const maxTemp = Math.max(...temps);
              const minTemp = Math.min(...temps);
              const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

              const runMeta = history.find(r => r.run_id === id) || {};
              const runTitleDate = formatRunDate(runMeta.run_date || dataset.run_date || runMeta.run_timestamp);
              const runSubtitle = dataset.filename || runMeta.run_date || `RUN ${id}`;
              const isDownloadingThisRun = !!runDownloading[id];

              return (
                <section key={id} style={{ ...S.runSection, minWidth:0 }}>
                  <div style={S.runHeader}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                        <div style={{ width:"3px", height:"32px", background:accent, borderRadius:"2px", flexShrink:0 }} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.22em", color:accent, marginBottom:"2px" }}>{graphLabel}</div>
                          <div style={{ ...S.runTitle, color:"#1e1c3a" }}>{runTitleDate}</div>
                          <div style={S.runSub}>{runSubtitle}</div>
                        </div>
                      </div>

                      <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                        <button
                          onClick={() => handleDownloadSingleRun(id)}
                          disabled={isDownloadingThisRun}
                          style={{
                            ...S.downloadRunBtn,
                            opacity: isDownloadingThisRun ? 0.65 : 1,
                            cursor: isDownloadingThisRun ? "not-allowed" : "pointer",
                          }}
                          title="Download this run as Excel"
                        >
                          {isDownloadingThisRun ? (
                            <span style={{ display:"inline-block", width:"9px", height:"9px", border:"1.5px solid rgba(22,163,74,0.3)", borderTopColor:"#16a34a", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {isDownloadingThisRun ? "…" : "XLSX"}
                        </button>

                        {isAdmin && (
                          <button onClick={() => deleteRun(id)} style={S.deleteBtn} title="Delete this run">
                            DELETE
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1px", marginTop:"10px" }}>
                      {[
                        { l:"MAX", v:`${maxTemp.toFixed(0)}°C`, c:"#dc2626" },
                        { l:"MIN", v:`${minTemp.toFixed(0)}°C`, c:"#0891b2" },
                        { l:"AVG", v:`${avgTemp}°C`,            c:"#d97706" },
                        { l:"LEVELS", v:runData.length,          c:"#6e6c96" },
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
                      <button key={k} onClick={() => setTab(id, k)} style={{ ...S.tabBtn, ...(getTab(id) === k ? S.tabActive : {}) }}>{l}</button>
                    ))}
                  </div>

                  {getTab(id) === "graph" && (
                    <div style={S.chartPanel}>
                      <div style={S.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</div>
                      <div style={{ width:"100%", height:CHART_HEIGHT }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={runData} layout="vertical">
                            <CartesianGrid strokeDasharray="2 8" stroke="#e8e6f4" vertical />
                            <YAxis dataKey="elevation" type="number" domain={[minElevation, maxElevation]} ticks={allElevations} interval={0} reversed width={44} tick={{ fill:"#a0a0c0", fontSize:9, fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                            <XAxis type="number" domain={[xMin - xPadding, xMax + xPadding]} tick={{ fill:"#a0a0c0", fontSize:9, fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            {cornerKeys.map(k => currentVisibleLines[k] && (
                              <Line key={k} type="monotone" dataKey={k} stroke={dynamicColors[k]} dot={false} strokeWidth={2} connectNulls={false} />
                            ))}
                            {currentVisibleLines.avg && (
                              <Line type="monotone" dataKey="avg" stroke={dynamicColors.avg} dot={false} strokeWidth={3} connectNulls={false} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={S.filterBar}>
                        {Object.keys(dynamicColors).map(k => (
                          <button
                            key={k}
                            onClick={() => setVisibleLines(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [k]: !(prev[id]?.[k] ?? true) } }))}
                            style={{ ...S.filterBtn, background: currentVisibleLines[k] ? dynamicColors[k] + "18" : "#f5f5fb", borderColor: currentVisibleLines[k] ? dynamicColors[k] : "#e2e1f0", color: currentVisibleLines[k] ? dynamicColors[k] : "#a0a0c0" }}
                          >
                            {dynamicLabels[k]}
                          </button>
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
                              <th style={S.th}>ELEVATION (M)</th>
                              {cornerKeys.map(k => <th key={k} style={S.th}>{dynamicLabels[k]}</th>)}
                              <th style={S.th}>AVERAGE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runData.map((row, i) => (
                              <tr key={i} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                                <td style={S.td}>{row.elevation}m</td>
                                {cornerKeys.map(k => <td key={k} style={S.td}>{row[k] ?? "—"}</td>)}
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
            <div style={S.modalText}>Run data has been saved and added to the run archive.</div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div style={S.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div style={{ ...S.modal, maxWidth:"420px", textAlign:"left" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.1em", color:"#1e1c3a" }}>DOWNLOAD REPORT</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", marginTop:"3px", letterSpacing:"0.08em" }}>
                  Single Excel file with separate sheets for each run
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} style={{ border:"1px solid #eee", background:"#fff", borderRadius:"10px", width:"32px", height:"32px", cursor:"pointer", color:"#6e6c96", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
              <div style={S.field}>
                <div style={S.fieldLabel}>FROM DATE</div>
                <input type="date" value={reportFromDate} onChange={e => { setReportFromDate(e.target.value); setReportError(""); }} style={{ ...S.fieldInput, fontSize:"13px" }} />
              </div>
              <div style={S.field}>
                <div style={S.fieldLabel}>TO DATE</div>
                <input type="date" value={reportToDate} onChange={e => { setReportToDate(e.target.value); setReportError(""); }} style={{ ...S.fieldInput, fontSize:"13px" }} />
              </div>
            </div>

            {reportError && (
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#dc2626", letterSpacing:"0.08em", marginBottom:"12px", padding:"8px 10px", background:"#fff1f2", borderRadius:"6px", border:"1px solid #fecdd3" }}>
                {reportError}
              </div>
            )}

            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:"#b0aed0", letterSpacing:"0.06em", marginBottom:"14px", padding:"8px 10px", background:"#f5f4ff", borderRadius:"6px" }}>
              Station: <strong style={{ color:"#4f46e5" }}>{getStationName() || "—"}</strong> · Unit: <strong style={{ color:"#4f46e5" }}>{getUnitName() || "—"}</strong>
            </div>

            <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
              <button onClick={() => setShowReportModal(false)} style={S.secondaryBtn}>CANCEL</button>
              <button
                onClick={handleDownloadReport}
                disabled={reportDownloading}
                style={{ ...S.primaryBtn, opacity: reportDownloading ? 0.7 : 1, display:"flex", alignItems:"center", gap:"6px" }}
              >
                {reportDownloading ? (
                  <>
                    <span style={{ display:"inline-block", width:"10px", height:"10px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                    GENERATING…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    DOWNLOAD XLSX
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIngestModal && (
        <div style={S.ingestOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowIngestModal(false); }}>
          <div style={{ ...S.ingestSheet, padding: isNarrow ? 0 : "16px" }}>
            <div style={{
              ...S.ingestModal,
              width: "min(980px, 100%)",
              height: isNarrow ? "100%" : "auto",
              maxHeight: isNarrow ? "100%" : "min(92vh, 860px)",
              borderRadius: isNarrow ? 0 : "14px",
            }} role="dialog" aria-modal="true">

              <div style={{ ...S.ingestHeader, position:"sticky", top:0, zIndex:3 }}>
                <div>
                  <div style={S.ingestTitle}>BASIC INFORMATION</div>
                  <div style={S.ingestSub}>Step {["run","elevation","boiler","flue","mills"].indexOf(ingestTab) + 1} of 5 — Fill the highlighted Excel fields</div>
                </div>
                <button onClick={() => setShowIngestModal(false)} style={S.ingestClose} aria-label="Close">✕</button>
              </div>

              <div style={{ ...S.ingestTabs, position:"sticky", top:64, zIndex:2, overflowX: isNarrow ? "auto" : "visible", WebkitOverflowScrolling:"touch", flexWrap: isNarrow ? "nowrap" : S.ingestTabs.flexWrap }}>
                {[
                  { k:"run", l:"1. RUN" },
                  { k:"elevation", l:"2. ELEVATION" },
                  { k:"boiler", l:"3. BOILER" },
                  { k:"flue", l:"4. FLUE GAS" },
                  { k:"mills", l:"5. COAL MILLS" },
                ].map(t => (
                  <button key={t.k} onClick={() => setIngestTab(t.k)} style={{ ...S.ingestTabBtn, ...(ingestTab === t.k ? S.ingestTabActive : {}) }}>{t.l}</button>
                ))}
              </div>

              <div style={{ ...S.ingestBody, padding: isNarrow ? "12px 10px 10px" : S.ingestBody.padding }}>
                {ingestTab === "run" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k:"run_date", l:"DATE", type:"date" },
                      { k:"run_time", l:"TIME", type:"time" },
                      { k:"load_mw", l:"LOAD (MW)", type:"number" },
                      { k:"total_coal_flow_tph", l:"TOTAL COAL FLOW (TPH)", type:"number" },
                      { k:"total_air_flow_tph", l:"TOTAL AIR FLOW (TPH)", type:"number" },
                      { k:"burner_tilt_deg", l:"BURNER TILT (DEG)", type:"number" },
                      { k:"coal_mills_in_service_count", l:"COAL MILLS IN SERVICE (COUNT)", type:"number" },
                      { k:"coal_mills_in_service", l:"COAL MILLS IN SERVICE (E.G. ABDEFG)", type:"text" },
                      { k:"oil_guns_in_service_count", l:"OIL GUNS IN SERVICE (COUNT)", type:"number" },
                      { k:"oil_guns_in_service", l:"OIL GUNS IN SERVICE (E.G. 10,27,24,17)", type:"text" },
                      { k:"notes", l:"NOTES", type:"text", span: isNarrow ? 1 : 2 },
                    ].map(f => (
                      <div key={f.k} style={{ ...S.field, gridColumn: f.span ? `span ${f.span}` : undefined }}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input
                          type={f.type}
                          inputMode={f.type === "number" ? "decimal" : undefined}
                          value={runDraft.meta[f.k]}
                          onChange={(e) => setRunDraft(p => ({ ...p, meta: { ...p.meta, [f.k]: e.target.value } }))}
                          style={{ ...S.fieldInput, padding: isNarrow ? "12px 12px" : S.fieldInput.padding, fontSize: isNarrow ? "15px" : S.fieldInput.fontSize }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {ingestTab === "elevation" && (
                  <div>
                    <div style={S.ingestToolbar}>
                      <div style={S.helperText}>Add/remove corner columns & elevation rows, then enter temperatures by elevation.</div>
                      
                      {/* Corner Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#b0aed0", letterSpacing: "0.08em" }}>CORNERS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button 
                            style={{ ...S.smallBtn, borderRadius: "10px 0 0 10px", padding: "8px 8px" }} 
                            onClick={() => setRunDraft(p => {
                              const next = nextCornerLabel(p.elevation.columns);
                              const columns = [...p.elevation.columns, next];
                              const rows = p.elevation.rows.map(r => ({ ...r, values: { ...r.values, [next]: "" } }));
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            })}
                            title="Add Corner"
                          >
                            +
                          </button>
                          <button 
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: runDraft.elevation.columns.length <= 1 ? 0.5 : 1 }} 
                            disabled={runDraft.elevation.columns.length <= 1}
                            onClick={() => setRunDraft(p => {
                              const columns = p.elevation.columns.slice(0, -1);
                              const removed = p.elevation.columns[p.elevation.columns.length - 1];
                              const rows = p.elevation.rows.map(r => { const v = { ...(r.values || {}) }; delete v[removed]; return { ...r, values: v }; });
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            })}
                            title="Remove Corner"
                          >
                            −
                          </button>
                        </div>
                      </div>

                      {/* Elevation Row Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#b0aed0", letterSpacing: "0.08em" }}>ROWS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button 
                            style={{ ...S.smallBtn, borderRadius: "10px 0 0 10px", padding: "8px 8px" }}
                            onClick={() => setRunDraft(p => {
                              const values = Object.fromEntries(p.elevation.columns.map((c) => [c, ""]));
                              return { ...p, elevation: { ...p.elevation, rows: [...p.elevation.rows, { elevation_m: "", values }] } };
                            })}
                            title="Add Elevation Row"
                          >
                            +
                          </button>
                          <button 
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: runDraft.elevation.rows.length <= 1 ? 0.5 : 1 }} 
                            disabled={runDraft.elevation.rows.length <= 1}
                            onClick={() => setRunDraft(p => ({
                              ...p,
                              elevation: { ...p.elevation, rows: p.elevation.rows.slice(0, -1) }
                            }))}
                            title="Remove Elevation Row"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", border:"1px solid #f0eef8", borderRadius:"10px" }}>
                      <table style={{ ...S.table, minWidth:560 }}>
                        <thead>
                          <tr>
                            <th style={S.th}>ELEVATION (M)</th>
                            {runDraft.elevation.columns.map((c) => <th key={c} style={S.th}>{c.toUpperCase()}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {runDraft.elevation.rows.map((r, idx) => (
                            <tr key={idx} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                              <td style={S.td}>
                                <input value={r.elevation_m} onChange={(e) => setRunDraft(p => { const rows=[...p.elevation.rows]; rows[idx]={...rows[idx],elevation_m:e.target.value}; return {...p,elevation:{...p.elevation,rows}}; })} inputMode="decimal" style={{ ...S.cellInput, fontSize: isMobileSheet?"14px":S.cellInput.fontSize }} placeholder="e.g. 56.4" />
                              </td>
                              {runDraft.elevation.columns.map((c) => (
                                <td key={c} style={S.td}>
                                  <input value={r.values?.[c]??""} onChange={(e) => setRunDraft(p => { const rows=[...p.elevation.rows]; const row=rows[idx]; rows[idx]={...row,values:{...(row.values||{}),[c]:e.target.value}}; return {...p,elevation:{...p.elevation,rows}}; })} inputMode="decimal" style={{ ...S.cellInput, fontSize: isMobileSheet?"14px":S.cellInput.fontSize }} placeholder="°C" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop:"10px" }}>
                      <div style={S.helperText}>Tip: averages are auto-calculated from non-empty corners.</div>
                    </div>
                  </div>
                )}

                {ingestTab === "boiler" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k:"main_steam_pressure_l", l:"MAIN STEAM PRESSURE (L)" },
                      { k:"main_steam_pressure_r", l:"MAIN STEAM PRESSURE (R)" },
                      { k:"main_steam_flow_l",     l:"MAIN STEAM FLOW (L)" },
                      { k:"main_steam_flow_r",     l:"MAIN STEAM FLOW (R)" },
                      { k:"superheat_spray_l",     l:"SUPERHEAT SPRAY (L)" },
                      { k:"superheat_spray_r",     l:"SUPERHEAT SPRAY (R)" },
                      { k:"reheat_spray_l",        l:"REHEAT SPRAY (L)" },
                      { k:"reheat_spray_r",        l:"REHEAT SPRAY (R)" },
                      { k:"o2_aph_inlet_pcr_l",    l:"O₂ AT APH INLET (PCR) (L)" },
                      { k:"o2_aph_inlet_pcr_r",    l:"O₂ AT APH INLET (PCR) (R)" },
                      { k:"wind_box_dp_l",         l:"WIND BOX DP A/B (L)" },
                      { k:"wind_box_dp_r",         l:"WIND BOX DP A/B (R)" },
                      { k:"total_pa_flow",         l:"TOTAL PA FLOW (TPH)" },
                      { k:"total_fd_fan_flow",     l:"TOTAL FD FAN FLOW (TPH)" },
                      { k:"total_pa_to_windbox_flow", l:"TOTAL PA TO WIND BOX (TPH)" },
                    ].map(f => (
                      <div key={f.k} style={S.field}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input type="number" inputMode="decimal" value={runDraft.boiler[f.k]} onChange={(e) => setRunDraft(p => ({ ...p, boiler: { ...p.boiler, [f.k]: e.target.value } }))} style={{ ...S.fieldInput, padding: isMobileSheet?"12px 12px":S.fieldInput.padding }} />
                      </div>
                    ))}
                  </div>
                )}

                {ingestTab === "flue" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k:"fg_temp_after_dpsh_l", l:"FG TEMP AFTER DPSH (L)" },
                      { k:"fg_temp_after_dpsh_r", l:"FG TEMP AFTER DPSH (R)" },
                      { k:"fg_temp_after_psh_l",  l:"FG TEMP AFTER PSH (L)" },
                      { k:"fg_temp_after_psh_r",  l:"FG TEMP AFTER PSH (R)" },
                      { k:"fg_temp_after_rh_l",   l:"FG TEMP AFTER RH (L)" },
                      { k:"fg_temp_after_rh_r",   l:"FG TEMP AFTER RH (R)" },
                      { k:"fg_temp_after_hsh_l",  l:"FG TEMP AFTER HSH (L)" },
                      { k:"fg_temp_after_hsh_r",  l:"FG TEMP AFTER HSH (R)" },
                      { k:"fg_temp_after_eco_l",  l:"FG TEMP AFTER ECONOMIZER (L)" },
                      { k:"fg_temp_after_eco_r",  l:"FG TEMP AFTER ECONOMIZER (R)" },
                      { k:"fg_temp_after_aph_l",  l:"FG TEMP AFTER APH (L)" },
                      { k:"fg_temp_after_aph_r",  l:"FG TEMP AFTER APH (R)" },
                    ].map(f => (
                      <div key={f.k} style={S.field}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input type="number" inputMode="decimal" value={runDraft.flueGas[f.k]} onChange={(e) => setRunDraft(p => ({ ...p, flueGas: { ...p.flueGas, [f.k]: e.target.value } }))} style={{ ...S.fieldInput, padding: isMobileSheet?"12px 12px":S.fieldInput.padding }} />
                      </div>
                    ))}
                  </div>
                )}

                {ingestTab === "mills" && (
                  <div>
                    {/* UPDATED: Side-by-side controls for Mills with MAX_MILLS cap */}
                    <div style={S.ingestToolbar}>
                      <div style={S.helperText}>Add/remove coal mill columns (A, B, C…) and enter their parameters. Max {MAX_MILLS} mills.</div>
                      
                      {/* Mill Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#b0aed0", letterSpacing: "0.08em" }}>MILLS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button 
                            style={{ 
                              ...S.smallBtn, 
                              borderRadius: "10px 0 0 10px", 
                              padding: "8px 8px",
                              opacity: runDraft.coalMills.mills.length >= MAX_MILLS ? 0.5 : 1,
                              cursor: runDraft.coalMills.mills.length >= MAX_MILLS ? "not-allowed" : "pointer"
                            }}
                            disabled={runDraft.coalMills.mills.length >= MAX_MILLS}
                            onClick={() => setRunDraft(p => {
                              if (p.coalMills.mills.length >= MAX_MILLS) return p;
                              const used = new Set(p.coalMills.mills);
                              const next = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(x => !used.has(x)) || `M${p.coalMills.mills.length+1}`;
                              const mills = [...p.coalMills.mills, next];
                              const byMill = { ...p.coalMills.byMill, [next]: { coal_flow_tph:"", pa_flow_tph:"", mill_dp_mmwc:"", mill_outlet_temp:"", mill_current_amp:"" } };
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            })}
                            title={runDraft.coalMills.mills.length >= MAX_MILLS ? `Maximum ${MAX_MILLS} mills allowed` : "Add Mill"}
                          >
                            +
                          </button>
                          <button 
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: runDraft.coalMills.mills.length <= 1 ? 0.5 : 1 }} 
                            disabled={runDraft.coalMills.mills.length <= 1}
                            onClick={() => setRunDraft(p => {
                              const mills = p.coalMills.mills.slice(0,-1);
                              const removed = p.coalMills.mills[p.coalMills.mills.length-1];
                              const byMill = { ...p.coalMills.byMill }; delete byMill[removed];
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            })}
                            title="Remove Mill"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", border:"1px solid #f0eef8", borderRadius:"10px" }}>
                      <table style={{ ...S.table, minWidth:640 }}>
                        <thead>
                          <tr>
                            <th style={S.th}>PARAMETER</th>
                            {runDraft.coalMills.mills.map(m => <th key={m} style={S.th}>MILL {m}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { k:"coal_flow_tph",    l:"COAL FLOW (TPH)"      },
                            { k:"pa_flow_tph",      l:"PA FLOW (TPH)"        },
                            { k:"mill_dp_mmwc",     l:"MILL DP (MMWC)"       },
                            { k:"mill_outlet_temp", l:"MILL OUTLET TEMP (°C)"},
                            { k:"mill_current_amp", l:"MILL CURRENT (AMP)"   },
                          ].map(row => (
                            <tr key={row.k} style={{ borderBottom:"0.5px solid #eeecf8" }}>
                              <td style={S.td}>{row.l}</td>
                              {runDraft.coalMills.mills.map(m => (
                                <td key={m} style={S.td}>
                                  <input value={runDraft.coalMills.byMill?.[m]?.[row.k]??""} onChange={(e) => setRunDraft(p => ({ ...p, coalMills: { ...p.coalMills, byMill: { ...p.coalMills.byMill, [m]: { ...(p.coalMills.byMill?.[m]||{}), [row.k]: e.target.value } } } }))} inputMode="decimal" style={S.cellInput} placeholder="—" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ ...S.ingestFooter, position:"sticky", bottom:0, zIndex:2 }}>
                <div style={S.footerHint}>Station: <strong>{getStationName()||"—"}</strong> · Unit: <strong>{getUnitId()||"—"}</strong></div>
                <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", justifyContent: isNarrow ? "stretch" : "flex-end", width: isNarrow ? "100%" : "auto" }}>
                  <button onClick={() => setShowIngestModal(false)} style={{ ...S.secondaryBtn, width: isNarrow?"100%":"auto" }}>CANCEL</button>
                  {ingestTab === "mills" ? (
                    <button onClick={submitRunDraft} disabled={uploading} style={{ ...S.primaryBtn, width: isNarrow?"100%":"auto", opacity: uploading ? 0.7 : 1 }}>
                      {uploading ? "SAVING…" : "SAVE RUN"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const tabs = ["run","elevation","boiler","flue","mills"];
                        const currentIdx = tabs.indexOf(ingestTab);
                        setIngestTab(tabs[currentIdx + 1]);
                      }} 
                      style={{ ...S.primaryBtn, width: isNarrow?"100%":"auto" }}
                    >
                      SAVE & NEXT
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const S = {
  modalOverlay: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(20,18,40,0.4)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
  modal: { width:"90%", maxWidth:"360px", padding:"24px", background:"#ffffff", borderRadius:"12px", textAlign:"center", boxShadow:"0 20px 35px -10px rgba(0,0,0,0.2)" },
  modalIcon: { width:"50px", height:"50px", borderRadius:"50%", background:"#16a34a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto 12px" },
  modalTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.1em", color:"#16a34a" },
  modalText: { fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#6e6c96", marginTop:"8px", letterSpacing:"0.05em" },

  ingestOverlay: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(20,18,40,0.55)", backdropFilter:"blur(8px)", display:"flex", alignItems:"stretch", justifyContent:"stretch", padding:0, zIndex:200 },
  ingestSheet: { flex:1, width:"100%", height:"100%", display:"flex", alignItems:"stretch", justifyContent:"center", boxSizing:"border-box" },
  ingestModal: { width:"min(980px,100%)", maxHeight:"min(92vh,860px)", background:"#ffffff", borderRadius:"14px", boxShadow:"0 28px 60px -18px rgba(0,0,0,0.35)", overflow:"hidden", display:"flex", flexDirection:"column" },
  ingestHeader: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px", padding:"14px 16px", borderBottom:"1px solid #f0eef8", background:"linear-gradient(180deg,#fbfaff 0%,#ffffff 100%)" },
  ingestTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.1em", color:"#1e1c3a" },
  ingestSub: { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", marginTop:"4px", letterSpacing:"0.08em" },
  ingestClose: { border:"1px solid #eee", background:"#fff", borderRadius:"10px", width:"36px", height:"36px", cursor:"pointer", color:"#6e6c96" },
  ingestTabs: { display:"flex", gap:"6px", padding:"10px 12px", borderBottom:"1px solid #f0eef8", flexWrap:"wrap", background:"#ffffff" },
  ingestTabBtn: { border:"0.5px solid #e2e1f0", background:"#fff", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"7px 10px", cursor:"pointer", borderRadius:"10px", color:"#b0aed0" },
  ingestTabActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },
  ingestBody: { padding:"12px 12px 10px", overflow:"auto" },
  ingestFooter: { padding:"12px 12px", borderTop:"1px solid #f0eef8", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", flexWrap:"wrap", background:"#ffffff" },
  footerHint: { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", letterSpacing:"0.08em" },
  ingestGrid: { display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:"10px" },
  ingestToolbar: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", marginBottom:"10px", flexWrap:"wrap" },
  helperText: { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", letterSpacing:"0.06em" },
  field: { display:"flex", flexDirection:"column", gap:"6px" },
  fieldLabel: { fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.18em", color:"#c8c6e0" },
  fieldInput: { width:"100%", border:"1px solid #e8e6f4", borderRadius:"10px", padding:"10px 10px", fontSize:"13px", outline:"none", background:"#fbfaff", boxSizing:"border-box" },
  cellInput: { width:"100%", border:"1px solid #e8e6f4", borderRadius:"8px", padding:"8px 8px", fontSize:"12px", outline:"none", background:"#ffffff" },
  smallBtn: { border:"1px solid #e8e6f4", background:"#ffffff", borderRadius:"10px", padding:"8px 10px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.1em", color:"#4f46e5" },
  primaryBtn: { border:"none", background:"#4f46e5", color:"#fff", borderRadius:"10px", padding:"10px 14px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.12em" },
  secondaryBtn: { border:"1px solid #e8e6f4", background:"#ffffff", color:"#6e6c96", borderRadius:"10px", padding:"10px 14px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.12em" },

  header: { background:"#ffffff", borderBottom:"1px solid #e8e6f4", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 0 rgba(79,70,229,0.06)" },
  hamburger: { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", gap:"4px", padding:"4px" },
  headerInner: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", flexWrap:"wrap" },
  hLine: { display:"block", width:"18px", height:"1.5px", background:"#9896c0" },
  logoMark: { width:"36px", height:"36px", border:"1px solid #e2e1f0", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5fb", flexShrink:0 },
  brandName: { fontSize:"clamp(10px,1.4vw,17px)", fontWeight:"600" },
  brandTag: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0", marginTop:"3px" },
  suLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.18em", color:"#b0aed0" },
  suVal: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", color:"#4f46e5", letterSpacing:"0.08em" },
  adminBadge: { padding:"4px 10px", background:"#4f46e5", color:"#fff", borderRadius:"20px", fontSize:"11px", fontWeight:"bold", letterSpacing:"0.5px" },
  statsRow: { display:"flex", alignItems:"center", gap:"20px", marginLeft:"auto" },
  statItem: { display:"flex", alignItems:"center", gap:"6px" },
  statN: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", color:"#4f46e5", lineHeight:1 },
  statL: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.15em", color:"#b0aed0" },
  logoutButton: { display:"flex", alignItems:"center", gap:"8px", padding:"8px 14px", background:"#dc2626", color:"#ffffff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"600", letterSpacing:"0.5px", flexShrink:0 },

  sidebar: { background:"#ffffff", borderRight:"1px solid #e8e6f4", position:"fixed", left:0, top:"56px", bottom:0, overflowY:"auto", transition:"transform 0.3s ease", zIndex:1000, width:"260px" },
  sideSection: { padding:"16px 14px", borderBottom:"1px solid #f0eef8" },
  secLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.28em", color:"#c8c6e0", marginBottom:"10px", paddingTop:"2px" },
  uploadBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#eeeeff", border:"none", borderRadius:"6px", color:"#4f46e5", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", marginBottom:"8px" },
  downloadBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", padding:"10px", background:"#f0fdf4", border:"none", borderRadius:"6px", color:"#16a34a", fontFamily:"'DM Mono',monospace", fontSize:"10px", letterSpacing:"0.15em", cursor:"pointer", boxSizing:"border-box" },

  runSection: { background:"#ffffff", border:"1px solid #e8e6f4", borderRadius:"10px", overflow:"hidden" },
  runHeader: { padding:"12px 14px", borderBottom:"1px solid #f0eef8", background:"#faf9ff" },
  runTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(12px,1.1vw,16px)", letterSpacing:"0.04em", color:"#1e1c3a" },
  runSub: { fontFamily:"'DM Mono',monospace", fontSize:"8px", color:"#c8c6e0", marginTop:"3px", letterSpacing:"0.06em" },
  kpiCard: { background:"#f5f4ff", padding:"7px 4px", textAlign:"center", borderRadius:"4px" },
  kpiVal: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(12px,1vw,15px)", letterSpacing:"0.05em", lineHeight:1 },
  kpiLbl: { fontFamily:"'DM Mono',monospace", fontSize:"7px", letterSpacing:"0.15em", color:"#b0aed0", marginTop:"3px" },

  tabBar: { display:"flex", gap:"3px", padding:"8px 10px", borderBottom:"1px solid #f0eef8", background:"#faf9ff", flexWrap:"wrap" },
  tabBtn: { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.08em", padding:"4px 7px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0" },
  tabActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },

  downloadRunBtn: { display:"flex", alignItems:"center", gap:"5px", background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#16a34a", padding:"5px 9px", borderRadius:"6px", fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.1em", flexShrink:0 },
  deleteBtn: { background:"#fff", border:"1px solid #f0eef8", color:"#dc2626", padding:"5px 9px", borderRadius:"6px", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.1em", flexShrink:0 },

  chartPanel: { padding:"14px", background:"#ffffff" },
  chartLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#c8c6e0", marginBottom:"10px" },
  filterBar: { display:"flex", gap:"4px", marginTop:"10px", flexWrap:"wrap" },
  filterBtn: { border:"0.5px solid", padding:"3px 7px", fontSize:"8px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.07em", cursor:"pointer", borderRadius:"4px" },

  tablePanel: { padding:"14px", background:"#ffffff" },
  subLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#c8c6e0", marginBottom:"10px" },
  table: { width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace", fontSize:"10px" },
  th: { padding:"6px 8px", textAlign:"left", fontSize:"8px", letterSpacing:"0.15em", color:"#c8c6e0", borderBottom:"1px solid #f0eef8", fontWeight:400 },
  td: { padding:"6px 8px", color:"#6e6c96" },
  noData: { fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#b0aed0", padding:"16px 0", letterSpacing:"0.08em" },

  tooltip: { background:"#ffffff", border:"1px solid #e8e6f4", padding:"10px 12px", minWidth:"150px", borderRadius:"6px", boxShadow:"0 4px 20px rgba(79,70,229,0.08)" },
  ttHead: { display:"flex", justifyContent:"space-between", marginBottom:"6px", paddingBottom:"6px", borderBottom:"1px solid #f0eef8" },
  ttLabel: { fontFamily:"'DM Mono',monospace", fontSize:"8px", letterSpacing:"0.2em", color:"#b0aed0" },
  ttVal: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", color:"#4f46e5" },
  ttRow: { display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px" },
  ttDot: { width:"5px", height:"5px", borderRadius:"50%", flexShrink:0 },
  ttKey: { fontFamily:"'DM Mono',monospace", fontSize:"8px", color:"#b0aed0", flex:1 },
  ttNum: { fontFamily:"'DM Mono',monospace", fontSize:"9px", fontWeight:"500" },

  navBtn: { border:"0.5px solid #e2e1f0", background:"none", fontFamily:"'DM Mono',monospace", fontSize:"9px", letterSpacing:"0.12em", padding:"7px 12px", cursor:"pointer", borderRadius:"4px", color:"#b0aed0", textAlign:"left" },
  navBtnActive: { background:"#eeeeff", borderColor:"#a5b4fc", color:"#4f46e5" },
};

console.log("App loaded successfully");
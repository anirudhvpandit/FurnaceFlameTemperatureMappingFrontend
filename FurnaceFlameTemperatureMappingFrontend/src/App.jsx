import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";
import { useNavigate } from "react-router-dom";

const BASE_URL = "https://abhiftm.com/api";

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
      burner_tilt_deg_1: "",
burner_tilt_deg_2: "",
burner_tilt_deg_3: "",
burner_tilt_deg_4: "",
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
      const present = values.filter(
        (v) => v != null && v !== 0
      );
      const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
      return {
        elevation_m,
        values: Object.fromEntries(cols.map((c, i) => [c, values[i]])),
        average: avg,
        burner_tilt_deg: safeNum(r.burner_tilt_deg), // ADD THIS LINE - ensure it's properly mapped
      };
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
      burner_tilt_deg_1: safeNum(draft.meta.burner_tilt_deg_1),
burner_tilt_deg_2: safeNum(draft.meta.burner_tilt_deg_2),
burner_tilt_deg_3: safeNum(draft.meta.burner_tilt_deg_3),
burner_tilt_deg_4: safeNum(draft.meta.burner_tilt_deg_4),
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

function buildGeneratePayload({
  runMeta,
  dataset,
  boiler,
  coal,
  stationName,
  unitId,
}) {

  const cornerKeys = Object.keys(dataset || {})
    .filter((k) => k.match(/^c\d+$/))
    .sort(
      (a, b) =>
        parseInt(a.match(/\d+/)[0]) -
        parseInt(b.match(/\d+/)[0])
    );

  const columns = cornerKeys.map(
    (k) => `Corner ${k.replace("c", "")}`
  );

  const rows = (dataset?.elevation || [])
    .map((el, i) => {

      const values = {};

      cornerKeys.forEach((k) => {
        const v = dataset[k]?.[i];

        values[`Corner ${k.replace("c", "")}`] =
          v != null && !isNaN(Number(v))
            ? Number(v)
            : null;
      });

      const avgRaw =
        dataset.average?.[i] ??
        dataset.avg_val?.[i] ??
        dataset.avg?.[i];

      const average =
        avgRaw != null && !isNaN(Number(avgRaw))
          ? Number(avgRaw)
          : null;

      return {
        elevation_m:
          el != null && !isNaN(Number(el))
            ? Number(el)
            : null,

        values,

        average,

        burner_tilt_deg:
          dataset.burner_tilt_deg?.[i] != null &&
          !isNaN(Number(dataset.burner_tilt_deg[i]))
            ? Number(dataset.burner_tilt_deg[i])
            : null,
      };

    })
    .filter(
      (r) =>
        r.elevation_m != null &&
        !isNaN(r.elevation_m)
    );

  const boiler_params = {};
  const flue_gas_temps = {};
  const bp = boiler || {};

  const boilerKeys = [
    "main_steam_pressure_l",
    "main_steam_pressure_r",
    "main_steam_flow_l",
    "main_steam_flow_r",
    "superheat_spray_l",
    "superheat_spray_r",
    "reheat_spray_l",
    "reheat_spray_r",
    "o2_aph_inlet_pcr_l",
    "o2_aph_inlet_pcr_r",
    "wind_box_dp_l",
    "wind_box_dp_r",
    "total_pa_flow",
  ];

  const flueKeys = [
    "fg_temp_after_dpsh_l",
    "fg_temp_after_dpsh_r",
    "fg_temp_after_psh_l",
    "fg_temp_after_psh_r",
    "fg_temp_after_rh_l",
    "fg_temp_after_rh_r",
    "fg_temp_after_hsh_l",
    "fg_temp_after_hsh_r",
    "fg_temp_after_eco_l",
    "fg_temp_after_eco_r",
    "fg_temp_after_aph_l",
    "fg_temp_after_aph_r",
  ];

  boilerKeys.forEach((k) => {
    boiler_params[k] = bp[k] ?? null;
  });

  flueKeys.forEach((k) => {
    flue_gas_temps[k] = bp[k] ?? null;
  });

  const coal_mill_params = (Array.isArray(coal) ? coal : [])
    .map((m) => ({
      mill: m.mill,

      coal_flow_tph:
        m.coal_flow_tph ?? null,

      pa_flow_tph:
        m.pa_flow_tph ?? null,

      mill_dp_mmwc:
        m.mill_dp_mmwc ?? null,

      mill_outlet_temp:
        m.mill_outlet_temp ?? null,

      mill_current_amp:
        m.mill_current_amp ?? null,
    }));

  const rawDate =
    runMeta.run_date ||
    runMeta.run_timestamp ||
    "";

  const dateStr = rawDate.slice(0, 10);

  return {
    station:
      stationName ||
      runMeta.location ||
      "",

    unit_id: unitId,

    run_meta: {
      run_date: dateStr,

      run_time:
        runMeta.run_time || "",

      load_mw:
        runMeta.load_mw ?? null,

      total_coal_flow_tph:
        runMeta.total_coal_flow_tph ?? null,

      total_air_flow_tph:
        runMeta.total_air_flow_tph ?? null,

      burner_tilt_deg_1:
        runMeta.burner_tilt_deg_1 ?? null,

      burner_tilt_deg_2:
        runMeta.burner_tilt_deg_2 ?? null,

      burner_tilt_deg_3:
        runMeta.burner_tilt_deg_3 ?? null,

      burner_tilt_deg_4:
        runMeta.burner_tilt_deg_4 ?? null,

      coal_mills_in_service_count:
        runMeta.coal_mills_in_service ?? null,

      coal_mills_in_service:
        runMeta.coal_mills_in_service_label ?? "",

      oil_guns_in_service_count:
        runMeta.oil_guns_in_service ?? null,

      oil_guns_in_service:
        runMeta.oil_guns_in_service_label ?? "",
    },

    elevation_profile: {
      columns,
      rows,
    },

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

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOWS = ["S", "M", "T", "W", "T", "F", "S"];
function pad2(n) { return String(n).padStart(2, "0"); }
function toDS(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

function MiniCal({ view, onNav, dataDates, selectedDate, onPick, isAdmin }) {
  const { y, m } = view;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = 0; i < first; i++) cells.push({ d: prev - first + 1 + i, ds: "", other: true });
  for (let d = 1; d <= days; d++) cells.push({ d, ds: toDS(y, m, d), other: false });

  return (
    <div style={C.calWrap}>
      <div style={C.calHead}>
        <button style={C.calNav} onClick={() => onNav(-1)}>‹</button>
        <span style={C.calMonth}>{MONTHS[m]} {y}</span>
        <button style={C.calNav} onClick={() => onNav(1)}>›</button>
      </div>
      <div style={C.calGrid}>
        {DOWS.map((d, i) => <div key={i} style={C.dow}>{d}</div>)}
        {cells.map(({ d, ds, other }, i) => {
          const isSel = !other && ds === selectedDate;
          const hd = !other && dataDates.has(ds);
          return (
            <div
              key={i}
              onClick={() => !other && onPick(ds)}
              style={{
                ...C.day,
                ...(other ? C.dayOther : {}),
                ...(isSel ? C.daySel : {}),
                cursor: (!other && (isAdmin || hd)) ? "pointer" : "default",
                position: "relative",
                opacity: (!other && !hd && !isAdmin) ? 0.4 : 1,
              }}
            >
              {d}
              {hd && (
                <span style={{
                  position: "absolute", bottom: "2px", left: "50%",
                  transform: "translateX(-50%)", width: "4px", height: "4px",
                  borderRadius: "50%",
                  background: isSel ? "#fff" : "#dc2626",
                  display: "block",
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
      if (mm < 0) { mm = 11; yy--; }
      return { y: yy, m: mm };
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        <div>
          <div style={C.miniLabel}>GRAPH 1</div>
          <MiniCal view={v1} onNav={d => nav(1, d)} dataDates={dataDates} selectedDate={graph1Date} onPick={onGraph1} isAdmin={isAdmin} />
        </div>
        <div>
          <div style={C.miniLabel}>GRAPH 2</div>
          <MiniCal view={v2} onNav={d => nav(2, d)} dataDates={dataDates} selectedDate={graph2Date} onPick={onGraph2} isAdmin={isAdmin} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "14px" }}>
        <div style={C.legItem}><span style={{ ...C.legDot, background: "#dc2626" }} />FTM AVAILABLE</div>
      </div>
    </div>
  );
}

const C = {
  calWrap: { background: "#f5f5fb", borderRadius: "6px", padding: "10px", border: "0.5px solid #e2e1f0" },
  calHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  calNav: { background: "none", border: "0.5px solid #d4d2e8", borderRadius: "4px", color: "#000", fontSize: "16px", cursor: "pointer", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  calMonth: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", color: "#000", fontFamily: "Inter, sans-serif" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px" },
  dow: { fontSize: "10px", letterSpacing: "0.06em", color: "#000", textAlign: "center", padding: "3px 0", fontFamily: "Inter, sans-serif" },
  day: { textAlign: "center", padding: "4px 1px", fontSize: "12px", borderRadius: "3px", color: "#000", fontFamily: "Inter, sans-serif" },
  dayOther: { color: "#000" },
  daySel: { background: "#4f46e5", color: "#000", borderRadius: "3px" },
  miniLabel: {
    fontSize: "10px", letterSpacing: "0.14em", color: "#000", marginBottom: "5px",
    fontFamily: "Inter, sans-serif"
  },
  legItem: { display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#000", letterSpacing: "0.06em", fontFamily: "Inter, sans-serif" },
  legDot: { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
};

function BoilerParamsTable({ data }) {
  if (!data || Object.keys(data).length === 0)
    return <div style={S.noData}>No boiler parameters recorded for this run.</div>;

  const leftRows = [
    { label: "Main Steam Pressure (Kg/cm²)", l: data.main_steam_pressure_l, r: data.main_steam_pressure_r },
    { label: "Main Steam Flow (TPH)", l: data.main_steam_flow_l, r: data.main_steam_flow_r },
    { label: "Superheat Spray (TPH)", l: data.superheat_spray_l, r: data.superheat_spray_r },
    { label: "Re-heat Spray (TPH)", l: data.reheat_spray_l, r: data.reheat_spray_r },
    { label: "O₂ at APH Inlet (PCR) %", l: data.o2_aph_inlet_pcr_l, r: data.o2_aph_inlet_pcr_r },
    { label: "Wind Box DP - A/B (mmwc)", l: data.wind_box_dp_l, r: data.wind_box_dp_r },
    { label: "Total PA Flow (TPH)", l: data.total_pa_flow, r: null, single: true },
  ];

  const fgRows = [
    { label: "FG Temp after DPSH (L/R) °C", l: data.fg_temp_after_dpsh_l, r: data.fg_temp_after_dpsh_r },
    { label: "FG Temp after PSH (L/R) °C", l: data.fg_temp_after_psh_l, r: data.fg_temp_after_psh_r },
    { label: "FG Temp after RH (L/R) °C", l: data.fg_temp_after_rh_l, r: data.fg_temp_after_rh_r },
    { label: "FG Temp after HSH (L/R) °C", l: data.fg_temp_after_hsh_l, r: data.fg_temp_after_hsh_r },
    { label: "FG Temp after Economizer (L/R) °C", l: data.fg_temp_after_eco_l, r: data.fg_temp_after_eco_r },
    { label: "FG Temp after APH (L/R) °C", l: data.fg_temp_after_aph_l, r: data.fg_temp_after_aph_r },
  ];

  const fmt = (v) => (v == null ? "—" : Number(v).toFixed(1));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                <tr key={row.label} style={{ borderBottom: "0.5px solid #eeecf8" }}>
                  <td style={S.td}>{row.label}</td>
                  <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>{fmt(row.l)}</td>
                  <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>
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
                <tr key={row.label} style={{ borderBottom: "0.5px solid #eeecf8" }}>
                  <td style={S.td}>{row.label}</td>
                  <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>{fmt(row.l)}</td>
                  <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>{fmt(row.r)}</td>
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
    { key: "coal_flow_tph", label: "Coal Flow (TPH)" },
    { key: "pa_flow_tph", label: "PA Flow (TPH)" },
    { key: "mill_dp_mmwc", label: "Mill DP (mmwc)" },
    { key: "mill_outlet_temp", label: "Mill Outlet Temp (°C)" },
    { key: "mill_current_amp", label: "Mill Current (Amp)" },
  ];

  const fmt = (v) => (v == null ? "—" : Number(v).toFixed(1));

  return (
    <div>
      <div style={S.subLabel}>COAL MILL PARAMETERS</div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>PARAMETER</th>
              {data.map(m => (
                <th key={m.mill} style={{ ...S.th, color: "#000" }}>MILL {m.mill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} style={{ borderBottom: "0.5px solid #eeecf8" }}>
                <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>{row.label}</td>
                {data.map(m => (
                  <td key={m.mill} style={{ ...S.td, color: "#000" }}>{fmt(m[row.key])}</td>
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

  const [viewMode, setViewMode] = useState("runs");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState([]);
  const [datasets, setDatasets] = useState({});
  const [boilerData, setBoilerData] = useState({});
  const [coalData, setCoalData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [runDownloading, setRunDownloading] = useState({});
  const [visibleLines, setVisibleLines] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocation, setUserLocation] = useState("all");

  const [graph1Date, setGraph1Date] = useState("");
  const [graph2Date, setGraph2Date] = useState("");
  const [dateError, setDateError] = useState("");

  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportError, setReportError] = useState("");

  const [dataDates, setDataDates] = useState(new Set());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingRunId, setEditingRunId] = useState(null);
const [editDraft, setEditDraft] = useState(null);
const [savingEdit, setSavingEdit] = useState(false);
  const navigation = useNavigate();

  const [ingestTab, setIngestTab] = useState("run");
  const [runDraft, setRunDraft] = useState(() => createEmptyRunDraft({
    stationName: (localStorage.getItem("selectedStation") ? JSON.parse(localStorage.getItem("selectedStation")).name : ""),
    unitId: (localStorage.getItem("selectedUnit") ? JSON.parse(localStorage.getItem("selectedUnit")).id : ""),
  }));

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) => setActiveTab(p => ({ ...p, [id]: tab }));

  const removeCoalMill = (millToRemove) => {
    setRunDraft(prev => {
      const updatedByMill = { ...prev.coalMills.byMill };
      delete updatedByMill[millToRemove];

      return {
        ...prev,
        coalMills: {
          mills: prev.coalMills.mills.filter(m => m !== millToRemove),
          byMill: updatedByMill,
        },
      };
    });
  };

  const buildRunData = (dataset) => {
  if (!dataset || !dataset.elevation) {
    console.warn("buildRunData: no dataset or no elevation", dataset);
    return [];
  }

  const cornerKeys = Object.keys(dataset)
    .filter(k => k.match(/^c\d+$/))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const result = dataset.elevation
    .map((el, i) => {
      const elNum = Number(el);
      const point = {
        elevation: elNum,
        burner_tilt_deg:
  dataset.burner_tilt_deg?.[i] ??
  dataset.burner_tilt_deg?.[String(i)] ??
  null, // ADD THIS LINE
        avg: (() => {
          const cornerValues = cornerKeys
            .map(k => dataset[k]?.[i])
            .map(v => Number(v))
            .filter(v => !isNaN(v) && v > 0);
          return cornerValues.length
            ? cornerValues.reduce((a, b) => a + b, 0) / cornerValues.length
            : null;
        })(),
      };
      cornerKeys.forEach(k => {
        const v = dataset[k]?.[i];
        point[k] = (v != null && v !== "" && !isNaN(Number(v))) ? Number(v) : null;
      });
      return point;
    })
    .filter(r => r.elevation != null && !isNaN(r.elevation));

  return result;
};

  useEffect(() => {
    const location = localStorage.getItem("location");
    const role = localStorage.getItem("role");
    setIsAdmin(role === "admin");
    setUserLocation(location);
  }, []);

  useEffect(()=>{
    console.log("edit draft check",editDraft);
    
  },[editDraft])

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
    setVisibleLines(prev => {
      const updated = {};

      selected.forEach(runId => {
        const dataset = datasets[runId];

        if (dataset) {
          if (prev[runId]) {
            updated[runId] = prev[runId];
          } else {
            const runData = buildRunData(dataset);

            const existingCorners = Object.keys(runData[0] || {})
              .filter(k => k.match(/^c\d+$/));

            updated[runId] = {
              ...Object.fromEntries(
                existingCorners.map((k, i) => [k, i < 2])
              ),
              avg: true,
            };
          }
        }
      });

      return updated;
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
      console.log("restdata", res.data);

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
        item.run_date === date
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
            const d = new Date(dateStr.$date);

            normalizedDate =
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    const dataset = datasets[runId];
    const runMeta = history.find(r => r.run_id === runId) || {};
    const boiler = boilerData[runId];
    const coal = coalData[runId];

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
      console.log("unit id ", x);

      const histRes = await axios.get(`${BASE_URL}/history`, {
        params: { station_id: getStationName(), unit_id: getUnitId() },
      });
      const toISO = (raw) => {
        if (!raw) return "";

        const str = String(raw).trim();

        // Already ISO
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        // DD/MM/YYYY -> YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
          const [day, month, year] = str.split("/");
          return `${year}-${month}-${day}`;
        }

        return "";
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

  const openEditModal = (runId) => {
  if (!isAdmin) {
    alert("Only administrators can edit data.");
    return;
  }

  const dataset = datasets[runId];
  const boiler = boilerData[runId] || {};
  const coal = coalData[runId] || [];
  const runMeta = history.find(r => r.run_id === runId);

  if (!dataset || !runMeta) {
    alert("Run data not loaded.");
    return;
  }

  const cornerKeys = Object.keys(dataset)
    .filter(k => k.match(/^c\d+$/))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const columns = cornerKeys.map(
    k => `Corner ${k.replace("c", "")}`
  );

  const rows = (dataset.elevation || []).map((el, i) => ({
    elevation_m: String(el),
    values: Object.fromEntries(
      columns.map((c, idx) => [
        c,
        dataset[`c${idx + 1}`]?.[i] ?? ""
      ])
    ),
    burner_tilt_deg: dataset.burner_tilt_deg?.[i] ?? "", // ADD THIS LINE
  }));

  const byMill = {};

  coal.forEach(m => {
    byMill[m.mill] = {
      coal_flow_tph: m.coal_flow_tph ?? "",
      pa_flow_tph: m.pa_flow_tph ?? "",
      mill_dp_mmwc: m.mill_dp_mmwc ?? "",
      mill_outlet_temp: m.mill_outlet_temp ?? "",
      mill_current_amp: m.mill_current_amp ?? "",
    };
  });

  const draft = {
    meta: {
      station: getStationName(),
      unit_id: getUnitId(),
      run_date: runMeta.run_date || "",
      run_time: runMeta.run_time || "",
      load_mw: runMeta.load_mw || "",
      total_coal_flow_tph: runMeta.total_coal_flow_tph || "",
      total_air_flow_tph: runMeta.total_air_flow_tph || "",
      burner_tilt_deg_1: runMeta.burner_tilt_deg_1 || "",
      burner_tilt_deg_2: runMeta.burner_tilt_deg_2 || "",
      burner_tilt_deg_3: runMeta.burner_tilt_deg_3 || "",
      burner_tilt_deg_4: runMeta.burner_tilt_deg_4 || "",
      coal_mills_in_service_count: runMeta.coal_mills_in_service_count || "",
      coal_mills_in_service: runMeta.coal_mills_in_service || "",
      oil_guns_in_service_count: runMeta.oil_guns_in_service_count || "",
      oil_guns_in_service: runMeta.oil_guns_in_service || "",
      notes: runMeta.notes || "",
    },
    elevation: {
      columns,
      rows,
    },
    boiler: {
      ...boiler
    },
    flueGas: {
      ...boiler
    },
    coalMills: {
      mills: coal.map(c => c.mill),
      byMill,
    },
  };

  setEditDraft(draft);
  setEditingRunId(runId);
  setShowIngestModal(true);
};

const saveEditedRun = async () => {
  if (!isAdmin) {
    alert("Only administrators can edit runs.");
    return;
  }

  try {
    setSavingEdit(true);
    
    const payload = buildUploadPayload(editDraft);
    console.log("editing,payload",editDraft);
    
    await axios.put(
      `${BASE_URL}/runs/${editingRunId}?username=${localStorage.getItem("username")}`,
      payload
    );

    setShowIngestModal(false);
    setEditingRunId(null);
    setEditDraft(null);

    await fetchHistory();
    await fetchMappingDates();

    if (selected.includes(editingRunId)) {
      const [dsRes, boilerRes, coalRes] = await Promise.all([
        axios.get(`${BASE_URL}/history/${editingRunId}`),
        axios.get(`${BASE_URL}/history/${editingRunId}/boiler-params`),
        axios.get(`${BASE_URL}/history/${editingRunId}/coal-mill-params`),
      ]);

      setDatasets(prev => ({
        ...prev,
        [editingRunId]: dsRes.data
      }));

      setBoilerData(prev => ({
        ...prev,
        [editingRunId]: boilerRes.data
      }));

      setCoalData(prev => ({
        ...prev,
        [editingRunId]: coalRes.data
      }));
    }

    alert("Run updated successfully.");

  } catch (err) {
    console.error(err);
    alert(
      err?.response?.data?.detail ||
      "Failed to update run"
    );
  } finally {
    setSavingEdit(false);
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

    const str = String(rawDate).trim();

    // Handle YYYY-MM-DD safely
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [year, month, day] = str.split("-");
      return `${day}/${month}/${year}`;
    }

    // Handle DD/MM/YYYY safely
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [day, month, year] = str.split("/");
      return `${day}/${month}/${year}`;
    }

    return str;
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
    <div style={{ background: "#f0eff8", minHeight: "100vh" }}>

      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            padding: "0 24px",
            gap: "20px",
          }}
        >

          {/* LEFT */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              minWidth: 0,
            }}
          >
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#111827",
                    borderRadius: "999px",
                  }}
                />
              ))}
            </button>

            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={img}
                alt=""
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "17px",
                  fontWeight: 900,
                  color: "#111827",
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.1,
                }}
              >
                ABHITECH FURNACE FLAME TEMPERATURE MAPPING
              </div>

              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  color: "#6b7280",
                  marginTop: "3px",
                  letterSpacing: "0.08em",
                }}
              >
                REAL TIME THERMAL ANALYTICS PLATFORM
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            {selectedStation && selectedUnit && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "999px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#9ca3af",
                    letterSpacing: "0.12em",
                  }}
                >
                  STATION
                </span>

                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {selectedStation}
                </span>

                <div
                  style={{
                    width: "1px",
                    height: "18px",
                    background: "#d1d5db",
                  }}
                />

                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#9ca3af",
                    letterSpacing: "0.12em",
                  }}
                >
                  UNIT
                </span>

                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {selectedUnit}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
            }}
          >

           

            {isAdmin && userLocation === "all" && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: "#ede9fe",
                  color: "#6d28d9",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                }}
              >
                ADMIN
              </div>
            )}

            <button
              onClick={handleLogout}
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#111827",
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "flex" }}>
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
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
{
  editingRunId
    ? (savingEdit ? "SAVING…" : "SAVE CHANGES")
    : (uploading ? "UPLOADING…" : "CREATE FTM RECORD")
}              </button>
            </div>
          )}

          <div style={S.sideSection}>
            <div style={S.secLabel}>DOWNLOAD REPORT</div>
            <button
              onClick={() => { setShowReportModal(true); setReportError(""); }}
              style={S.downloadBtn}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round" />
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
              <div style={{ marginTop: "8px", color: "#000", fontSize: "12px", fontFamily: "Inter, sans-serif", letterSpacing: "0.1em" }}>
                {dateError}
              </div>
            )}
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
                  <section key={`empty-${slotIdx}`} style={{ ...S.runSection, minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", opacity: 0.45 }}>
                    <div style={{ width: "3px", height: "28px", background: accent, borderRadius: "2px" }} />
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", letterSpacing: "0.22em", color: "#000" }}>{graphLabel}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", letterSpacing: "0.2em", color: "#000" }}>SELECT A DATE</div>
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
                <section key={id} style={{ ...S.runSection, minWidth: 0 }}>
                  <div style={S.runHeader}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div style={{ width: "3px", height: "32px", background: accent, borderRadius: "2px", flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", letterSpacing: "0.22em", color: "#000", marginBottom: "2px" }}>{graphLabel}</div>
                          <div style={{ ...S.runTitle, color: "#000" }}>{runTitleDate}</div>
                          
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
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
                            <span style={{ display: "inline-block", width: "9px", height: "9px", border: "1.5px solid rgba(22,163,74,0.3)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {isDownloadingThisRun ? "…" : "XLSX"}
                        </button>

                        {isAdmin && (
  <div style={{ display: "flex", gap: "6px" }}>

    <button
      onClick={() => openEditModal(id)}
      style={{
        ...S.downloadRunBtn,
        background: "#dbeafe",
        border: "1px solid #93c5fd",
        color: "#1d4ed8",
      }}
      title="Edit this run"
    >
      EDIT
    </button>

    <button
      onClick={() => deleteRun(id)}
      style={S.deleteBtn}
      title="Delete this run"
    >
      DELETE
    </button>

  </div>
)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", marginTop: "10px" }}>
                      {[
                        { l: "MAX", v: `${maxTemp.toFixed(0)}°C`, c: "#000" },
                        { l: "MIN", v: `${minTemp.toFixed(0)}°C`, c: "#000" },
                        { l: "AVG", v: `${avgTemp}°C`, c: "#000" },
                        { l: "LEVELS", v: runData.length, c: "#000" },
                      ].map(kpi => (
                        <div key={kpi.l} style={S.kpiCard}>
                          <div style={{ ...S.kpiVal, color: kpi.c }}>{kpi.v}</div>
                          <div style={S.kpiLbl}>{kpi.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={S.tabBar}>
                    {[
                      { k: "graph", l: "GRAPH" },
                      { k: "raw", l: "RAW DATA" },
                      { k: "boiler", l: "BOILER PARAMS" },
                      { k: "coal", l: "COAL MILLS" },
                    ].map(({ k, l }) => (
                      <button key={k} onClick={() => setTab(id, k)} style={{ ...S.tabBtn, ...(getTab(id) === k ? S.tabActive : {}) }}>{l}</button>
                    ))}
                  </div>

                  {getTab(id) === "graph" && (
                    <div style={S.chartPanel}>
                      <div style={S.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</div>
                      <div style={{ width: "100%", height: CHART_HEIGHT }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={runData} layout="vertical">
                            <CartesianGrid strokeDasharray="2 8" stroke="#e8e6f4" vertical />
                            <YAxis dataKey="elevation" type="number" domain={[minElevation, maxElevation]} ticks={allElevations} interval={0} reversed width={44} tick={{ fill: "#a0a0c0", fontSize: 11, fontFamily: "Inter, sans-serif" }} axisLine={false} tickLine={false} />
                            <XAxis type="number" domain={[xMin - xPadding, xMax + xPadding]} tick={{ fill: "#a0a0c0", fontSize: 11, fontFamily: "Inter, sans-serif" }} axisLine={false} tickLine={false} />
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
                            style={{
                              ...S.filterBtn,
                              background: currentVisibleLines[k]
                                ? dynamicColors[k] + "18"
                                : "#f3f4f6",

                              borderColor: currentVisibleLines[k]
                                ? dynamicColors[k]
                                : "#d1d5db",

                              color: currentVisibleLines[k]
                                ? dynamicColors[k]
                                : "#6b7280",
                            }}                          >
                            {dynamicLabels[k]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {getTab(id) === "raw" && (
                    <div style={S.tablePanel}>
                      <div style={S.chartLabel}>RAW MEASUREMENT DATA</div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>ELEVATION (M)</th>
                              <th style={S.th}>BURNER TILT DEG</th>
                              {cornerKeys.map(k => <th key={k} style={S.th}>{dynamicLabels[k]}</th>)}
                              <th style={S.th}>AVERAGE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runData.map((row, i) => (
                              <tr key={i} style={{ borderBottom: "0.5px solid #eeecf8" }}>
                                <td style={S.td}>{row.elevation}m</td>
                                <td style={S.td}>
  {row.burner_tilt_deg ?? "—"}
</td>
                                {cornerKeys.map(k => <td key={k} style={S.td}>{row[k] ?? "—"}</td>)}
                                <td style={{ ...S.td, color: "#000", fontWeight: 700 }}>{row.avg}</td>
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
          <div style={{ ...S.modal, maxWidth: "420px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", letterSpacing: "0.1em", color: "#000" }}>DOWNLOAD REPORT</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#000", marginTop: "3px", letterSpacing: "0.08em" }}>
                  Single Excel file with separate sheets for each run
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} style={{ border: "1px solid #eee", background: "#fff", borderRadius: "10px", width: "32px", height: "32px", cursor: "pointer", color: "#000", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              <div style={S.field}>
                <div style={S.fieldLabel}>FROM DATE</div>
                <input type="date" value={reportFromDate} onChange={e => { setReportFromDate(e.target.value); setReportError(""); }} style={{ ...S.fieldInput, fontSize: "15px" }} />
              </div>
              <div style={S.field}>
                <div style={S.fieldLabel}>TO DATE</div>
                <input type="date" value={reportToDate} onChange={e => { setReportToDate(e.target.value); setReportError(""); }} style={{ ...S.fieldInput, fontSize: "15px" }} />
              </div>
            </div>

            {reportError && (
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "12px", color: "#000", letterSpacing: "0.08em", marginBottom: "12px", padding: "8px 10px", background: "#fff1f2", borderRadius: "6px", border: "1px solid #fecdd3" }}>
                {reportError}
              </div>
            )}

            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "11px", color: "#000", letterSpacing: "0.06em", marginBottom: "14px", padding: "8px 10px", background: "#f5f4ff", borderRadius: "6px" }}>
              Station: <strong style={{ color: "#000" }}>{getStationName() || "—"}</strong> · Unit: <strong style={{ color: "#000" }}>{getUnitName() || "—"}</strong>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowReportModal(false)} style={S.secondaryBtn}>CANCEL</button>
              <button
                onClick={handleDownloadReport}
                disabled={reportDownloading}
                style={{ ...S.primaryBtn, opacity: reportDownloading ? 0.7 : 1, display: "flex", alignItems: "center", gap: "6px" }}
              >
                {reportDownloading ? (
                  <>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    GENERATING…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 1v8M4 10l3 3 3-3M2 13h10" strokeLinecap="round" strokeLinejoin="round" />
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

              <div style={{ ...S.ingestHeader, position: "sticky", top: 0, zIndex: 3 }}>
                <div>
                  <div style={S.ingestTitle}>BASIC INFORMATION</div>
                  <div style={S.ingestSub}>Step {["run", "elevation", "boiler", "flue", "mills"].indexOf(ingestTab) + 1} of 5 — Fill the highlighted Excel fields</div>
                </div>
                <button onClick={() => setShowIngestModal(false)} style={S.ingestClose} aria-label="Close">✕</button>
              </div>

              <div style={{ ...S.ingestTabs, position: "sticky", top: 64, zIndex: 2, overflowX: isNarrow ? "auto" : "visible", WebkitOverflowScrolling: "touch", flexWrap: isNarrow ? "nowrap" : S.ingestTabs.flexWrap }}>
                {[
                  { k: "run", l: "1. RUN" },
                  { k: "elevation", l: "2. ELEVATION" },
                  { k: "boiler", l: "3. BOILER" },
                  { k: "flue", l: "4. FLUE GAS" },
                  { k: "mills", l: "5. COAL MILLS" },
                ].map(t => (
                  <button key={t.k} onClick={() => setIngestTab(t.k)} style={{ ...S.ingestTabBtn, ...(ingestTab === t.k ? S.ingestTabActive : {}) }}>{t.l}</button>
                ))}
              </div>

              <div style={{ ...S.ingestBody, padding: isNarrow ? "12px 10px 10px" : S.ingestBody.padding }}>
                {ingestTab === "run" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k: "run_date", l: "DATE", type: "date" },
                      { k: "run_time", l: "TIME", type: "time" },
                      { k: "load_mw", l: "LOAD (MW)", type: "number" },
                      { k: "total_coal_flow_tph", l: "TOTAL COAL FLOW (TPH)", type: "number" },
                      { k: "total_air_flow_tph", l: "TOTAL AIR FLOW (TPH)", type: "number" },
                      
                      { k: "coal_mills_in_service_count", l: "COAL MILLS IN SERVICE (COUNT)", type: "number" },
                      { k: "coal_mills_in_service", l: "COAL MILLS IN SERVICE (E.G. ABDEFG)", type: "text" },
                      { k: "oil_guns_in_service_count", l: "OIL GUNS IN SERVICE (COUNT)", type: "number" },
                      { k: "oil_guns_in_service", l: "OIL GUNS IN SERVICE (E.G. 10,27,24,17)", type: "text" },
                      { k: "notes", l: "NOTES", type: "text", span: isNarrow ? 1 : 2 },
                    ].map(f => (
                      <div key={f.k} style={{ ...S.field, gridColumn: f.span ? `span ${f.span}` : undefined }}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input
                          type={f.type}
                          inputMode={f.type === "number" ? "decimal" : undefined}
                          value={(editingRunId ? editDraft : runDraft).meta[f.k]}
                          onChange={(e) => (!editingRunId ? setRunDraft(p => ({ ...p, meta: { ...p.meta, [f.k]: e.target.value } })) : setEditDraft(p => ({ ...p, meta: { ...p.meta, [f.k]: e.target.value } })))}
                          style={{ ...S.fieldInput, padding: isNarrow ? "12px 12px" : S.fieldInput.padding, fontSize: isNarrow ? "17px" : S.fieldInput.fontSize }}
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
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#000", letterSpacing: "0.08em" }}>CORNERS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button
                            style={{ ...S.smallBtn, borderRadius: "10px 0 0 10px", padding: "8px 8px" }}
                            onClick={() => (!editingRunId ? setRunDraft(p => {
                              const next = nextCornerLabel(p.elevation.columns);
                              const columns = [...p.elevation.columns, next];
                              const rows = p.elevation.rows.map(r => ({ ...r, values: { ...r.values, [next]: "" } }));
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            }) : setEditDraft(p => {
                              const next = nextCornerLabel(p.elevation.columns);
                              const columns = [...p.elevation.columns, next];
                              const rows = p.elevation.rows.map(r => ({ ...r, values: { ...r.values, [next]: "" } }));
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            }))}
                            title="Add Corner"
                          >
                            +
                          </button>
                          <button
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: (editingRunId ? editDraft : runDraft).elevation.columns.length <= 1 ? 0.5 : 1 }}
                            disabled={(editingRunId ? editDraft : runDraft).elevation.columns.length <= 1}
                            onClick={() => (!editingRunId ? setRunDraft(p => {
                              const columns = p.elevation.columns.slice(0, -1);
                              const removed = p.elevation.columns[p.elevation.columns.length - 1];
                              const rows = p.elevation.rows.map(r => { const v = { ...(r.values || {}) }; delete v[removed]; return { ...r, values: v }; });
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            }) : setEditDraft(p => {
                              const columns = p.elevation.columns.slice(0, -1);
                              const removed = p.elevation.columns[p.elevation.columns.length - 1];
                              const rows = p.elevation.rows.map(r => { const v = { ...(r.values || {}) }; delete v[removed]; return { ...r, values: v }; });
                              return { ...p, elevation: { ...p.elevation, columns, rows } };
                            }))}
                            title="Remove Corner"
                          >
                            −
                          </button>
                        </div>
                      </div>

                      {/* Elevation Row Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#000", letterSpacing: "0.08em" }}>ROWS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button
                            style={{ ...S.smallBtn, borderRadius: "10px 0 0 10px", padding: "8px 8px" }}
                            onClick={() => (!editingRunId ? setRunDraft(p => {
                              const values = Object.fromEntries(p.elevation.columns.map((c) => [c, ""]));
                              return { ...p, elevation: { ...p.elevation, rows: [...p.elevation.rows, { elevation_m: "", values }] } };
                            }): setEditDraft(p => {
                              const values = Object.fromEntries(p.elevation.columns.map((c) => [c, ""]));
                              return { ...p, elevation: { ...p.elevation, rows: [...p.elevation.rows, { elevation_m: "", values }] } };
                            }))}
                            title="Add Elevation Row"
                          >
                            +
                          </button>
                          <button
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: (editingRunId ? editDraft : runDraft).elevation.rows.length <= 1 ? 0.5 : 1 }}
                            disabled={(editingRunId ? editDraft : runDraft).elevation.rows.length <= 1}
                            onClick={() => (!editingRunId ? setRunDraft(p => ({
                              ...p,
                              elevation: { ...p.elevation, rows: p.elevation.rows.slice(0, -1) }
                            })) : setEditDraft(p => ({
                              ...p,
                              elevation: { ...p.elevation, rows: p.elevation.rows.slice(0, -1) }
                            })))}
                            title="Remove Elevation Row"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", border: "1px solid #f0eef8", borderRadius: "10px" }}>
                      <table style={{ ...S.table, minWidth: 560 }}>
                        <thead>
                          <tr>
                            <th style={S.th}>ELEVATION (M)</th>
                            <th style={S.th}>BURNER TILT DEG</th>
                            {(editingRunId ? editDraft : runDraft).elevation.columns.map((c) => <th key={c} style={S.th}>{c.toUpperCase()}</th>)}
                          </tr>
                        </thead>
                       <tbody>
      {(editingRunId ? editDraft : runDraft).elevation.rows.map((r, idx) => (
        <tr key={idx + 1} style={{ borderBottom: "0.5px solid #eeecf8" }}>
          <td style={S.td}>
            <input 
              value={r.elevation_m} 
              onChange={(e) => (
                !editingRunId 
                  ? setRunDraft(p => { 
                      const rows = [...p.elevation.rows]; 
                      rows[idx] = { ...rows[idx], elevation_m: e.target.value }; 
                      return { ...p, elevation: { ...p.elevation, rows } }; 
                    })
                  : setEditDraft(p => { 
                      const rows = [...p.elevation.rows]; 
                      rows[idx] = { ...rows[idx], elevation_m: e.target.value }; 
                      return { ...p, elevation: { ...p.elevation, rows } }; 
                    })
              )} 
              inputMode="decimal" 
              style={{ ...S.cellInput, fontSize: isMobileSheet ? "16px" : S.cellInput.fontSize }} 
              placeholder="e.g. 56.4" 
            />
          </td>
          <td style={S.td}>
            <input
              value={r.burner_tilt_deg}
              onChange={(e) => (
                !editingRunId
                  ? setRunDraft(p => {
                      const rows = [...p.elevation.rows];
                      rows[idx] = {
                        ...rows[idx],
                        burner_tilt_deg: e.target.value,
                      };
                      return {
                        ...p,
                        elevation: {
                          ...p.elevation,
                          rows,
                        },
                      };
                    })
                  : setEditDraft(p => {
                      const rows = [...p.elevation.rows];
                      rows[idx] = {
                        ...rows[idx],
                        burner_tilt_deg: e.target.value,
                      };
                      return {
                        ...p,
                        elevation: {
                          ...p.elevation,
                          rows,
                        },
                      };
                    })
              )}
              inputMode="decimal"
              style={{
                ...S.cellInput,
                fontSize: isMobileSheet ? "16px" : S.cellInput.fontSize,
              }}
              placeholder="e.g. 12.5"
            />
            </td>
                              {(editingRunId ? editDraft : runDraft).elevation.columns.map((c) => (
                                <td key={c} style={S.td}>
                                  <input value={r.values?.[c] ?? ""} onChange={(e) => ( !editingRunId ? setRunDraft(p => { const rows = [...p.elevation.rows]; const row = rows[idx]; rows[idx] = { ...row, values: { ...(row.values || {}), [c]: e.target.value } }; return { ...p, elevation: { ...p.elevation, rows } }; }): setEditDraft(p => { const rows = [...p.elevation.rows]; const row = rows[idx]; rows[idx] = { ...row, values: { ...(row.values || {}), [c]: e.target.value } }; return { ...p, elevation: { ...p.elevation, rows } }; }))} inputMode="decimal" style={{ ...S.cellInput, fontSize: isMobileSheet ? "14px" : S.cellInput.fontSize }} placeholder="°C" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div style={S.helperText}>Tip: averages are auto-calculated from non-empty corners.</div>
                    </div>
                  </div>
                )}

                {ingestTab === "boiler" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k: "main_steam_pressure_l", l: "MAIN STEAM PRESSURE (L)" },
                      { k: "main_steam_pressure_r", l: "MAIN STEAM PRESSURE (R)" },
                      { k: "main_steam_flow_l", l: "MAIN STEAM FLOW (L)" },
                      { k: "main_steam_flow_r", l: "MAIN STEAM FLOW (R)" },
                      { k: "superheat_spray_l", l: "SUPERHEAT SPRAY (L)" },
                      { k: "superheat_spray_r", l: "SUPERHEAT SPRAY (R)" },
                      { k: "reheat_spray_l", l: "REHEAT SPRAY (L)" },
                      { k: "reheat_spray_r", l: "REHEAT SPRAY (R)" },
                      { k: "o2_aph_inlet_pcr_l", l: "O₂ AT APH INLET (PCR) (L)" },
                      { k: "o2_aph_inlet_pcr_r", l: "O₂ AT APH INLET (PCR) (R)" },
                      { k: "wind_box_dp_l", l: "WIND BOX DP A/B (L)" },
                      { k: "wind_box_dp_r", l: "WIND BOX DP A/B (R)" },
                      { k: "total_pa_flow", l: "TOTAL PA FLOW (TPH)" },
                      { k: "total_fd_fan_flow", l: "TOTAL FD FAN FLOW (TPH)" },
                      { k: "total_pa_to_windbox_flow", l: "TOTAL PA TO WIND BOX (TPH)" },
                    ].map(f => (
                      <div key={f.k} style={S.field}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input type="number" inputMode="decimal" value={(editingRunId ? editDraft : runDraft).boiler[f.k]} onChange={(e) => setRunDraft(p => ({ ...p, boiler: { ...p.boiler, [f.k]: e.target.value } }))} style={{ ...S.fieldInput, padding: isMobileSheet ? "12px 12px" : S.fieldInput.padding }} />
                      </div>
                    ))}
                  </div>
                )}

                {ingestTab === "flue" && (
                  <div style={{ ...S.ingestGrid, gridTemplateColumns: isNarrow ? "1fr" : S.ingestGrid.gridTemplateColumns }}>
                    {[
                      { k: "fg_temp_after_dpsh_l", l: "FG TEMP AFTER DPSH (L)" },
                      { k: "fg_temp_after_dpsh_r", l: "FG TEMP AFTER DPSH (R)" },
                      { k: "fg_temp_after_psh_l", l: "FG TEMP AFTER PSH (L)" },
                      { k: "fg_temp_after_psh_r", l: "FG TEMP AFTER PSH (R)" },
                      { k: "fg_temp_after_rh_l", l: "FG TEMP AFTER RH (L)" },
                      { k: "fg_temp_after_rh_r", l: "FG TEMP AFTER RH (R)" },
                      { k: "fg_temp_after_hsh_l", l: "FG TEMP AFTER HSH (L)" },
                      { k: "fg_temp_after_hsh_r", l: "FG TEMP AFTER HSH (R)" },
                      { k: "fg_temp_after_eco_l", l: "FG TEMP AFTER ECONOMIZER (L)" },
                      { k: "fg_temp_after_eco_r", l: "FG TEMP AFTER ECONOMIZER (R)" },
                      { k: "fg_temp_after_aph_l", l: "FG TEMP AFTER APH (L)" },
                      { k: "fg_temp_after_aph_r", l: "FG TEMP AFTER APH (R)" },
                    ].map(f => (
                      <div key={f.k} style={S.field}>
                        <div style={S.fieldLabel}>{f.l}</div>
                        <input type="number" inputMode="decimal" value={(editingRunId ? editDraft : runDraft).flueGas[f.k]} onChange={(e) => setRunDraft(p => ({ ...p, flueGas: { ...p.flueGas, [f.k]: e.target.value } }))} style={{ ...S.fieldInput, padding: isMobileSheet ? "12px 12px" : S.fieldInput.padding }} />
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
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#000", letterSpacing: "0.08em" }}>MILLS</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button
                            style={{
                              ...S.smallBtn,
                              borderRadius: "10px 0 0 10px",
                              padding: "8px 8px",
                              opacity: (editingRunId ? editDraft : runDraft).coalMills.mills.length >= MAX_MILLS ? 0.5 : 1,
                              cursor: (editingRunId ? editDraft : runDraft).coalMills.mills.length >= MAX_MILLS ? "not-allowed" : "pointer"
                            }}
                            disabled={(editingRunId ? editDraft : runDraft).coalMills.mills.length >= MAX_MILLS}
                            onClick={() => (!editingId ? setRunDraft(p => {
                              if (p.coalMills.mills.length >= MAX_MILLS) return p;
                              const used = new Set(p.coalMills.mills);
                              const next = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(x => !used.has(x)) || `M${p.coalMills.mills.length + 1}`;
                              const mills = [...p.coalMills.mills, next];
                              const byMill = { ...p.coalMills.byMill, [next]: { coal_flow_tph: "", pa_flow_tph: "", mill_dp_mmwc: "", mill_outlet_temp: "", mill_current_amp: "" } };
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            }) : setEditDraft(p => {
                              if (p.coalMills.mills.length >= MAX_MILLS) return p;
                              const used = new Set(p.coalMills.mills);
                              const next = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(x => !used.has(x)) || `M${p.coalMills.mills.length + 1}`;
                              const mills = [...p.coalMills.mills, next];
                              const byMill = { ...p.coalMills.byMill, [next]: { coal_flow_tph: "", pa_flow_tph: "", mill_dp_mmwc: "", mill_outlet_temp: "", mill_current_amp: "" } };
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            }))}
                            title={(editingRunId ? editDraft : runDraft).coalMills.mills.length >= MAX_MILLS ? `Maximum ${MAX_MILLS} mills allowed` : "Add Mill"}
                          >
                            +
                          </button>
                          <button
                            style={{ ...S.smallBtn, borderRadius: "0 10px 10px 0", padding: "8px 8px", opacity: (editingRunId ? editDraft : runDraft).coalMills.mills.length <= 1 ? 0.5 : 1 }}
                            disabled={(editingRunId ? editDraft : runDraft).coalMills.mills.length <= 1}
                            onClick={() => (!editingRunId ? setRunDraft(p => {
                              const mills = p.coalMills.mills.slice(0, -1);
                              const removed = p.coalMills.mills[p.coalMills.mills.length - 1];
                              const byMill = { ...p.coalMills.byMill }; delete byMill[removed];
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            }) : setEditDraft(p => {
                              const mills = p.coalMills.mills.slice(0, -1);
                              const removed = p.coalMills.mills[p.coalMills.mills.length - 1];
                              const byMill = { ...p.coalMills.byMill }; delete byMill[removed];
                              return { ...p, coalMills: { ...p.coalMills, mills, byMill } };
                            }))}
                            title="Remove Mill"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", border: "1px solid #f0eef8", borderRadius: "10px" }}>
                      <table style={{ ...S.table, minWidth: 640 }}>
                        <thead>
                          <tr>
                            <th style={S.th}>PARAMETER</th>
                            {(editingRunId ? editDraft : runDraft).coalMills.mills.map(mill => (
                              <th key={mill}>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "6px"
                                }}>
                                  <span>{mill}</span>

                                  <button
                                    onClick={() => removeCoalMill(mill)}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "#dc2626",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      fontSize: "14px",
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { k: "coal_flow_tph", l: "COAL FLOW (TPH)" },
                            { k: "pa_flow_tph", l: "PA FLOW (TPH)" },
                            { k: "mill_dp_mmwc", l: "MILL DP (MMWC)" },
                            { k: "mill_outlet_temp", l: "MILL OUTLET TEMP (°C)" },
                            { k: "mill_current_amp", l: "MILL CURRENT (AMP)" },
                          ].map(row => (
                            <tr key={row.k} style={{ borderBottom: "0.5px solid #eeecf8" }}>
                              <td style={S.td}>{row.l}</td>
                              {(editingRunId ? editDraft : runDraft).coalMills.mills.map(m => (
                                <td key={m} style={S.td}>
                                  <input value={(editingRunId ? editDraft : runDraft).coalMills.byMill?.[m]?.[row.k] ?? ""} onChange={(e) => (!editingRunId ? setRunDraft(p => ({ ...p, coalMills: { ...p.coalMills, byMill: { ...p.coalMills.byMill, [m]: { ...(p.coalMills.byMill?.[m] || {}), [row.k]: e.target.value } } } })) : setRunDraft(p => ({ ...p, coalMills: { ...p.coalMills, byMill: { ...p.coalMills.byMill, [m]: { ...(p.coalMills.byMill?.[m] || {}), [row.k]: e.target.value } } } })))} inputMode="decimal" style={S.cellInput} placeholder="—" />
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

              <div style={{ ...S.ingestFooter, position: "sticky", bottom: 0, zIndex: 2 }}>
                <div style={S.footerHint}>Station: <strong>{getStationName() || "—"}</strong> · Unit: <strong>{getUnitId() || "—"}</strong></div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: isNarrow ? "stretch" : "flex-end", width: isNarrow ? "100%" : "auto" }}>
                  <button onClick={() => setShowIngestModal(false)} style={{ ...S.secondaryBtn, width: isNarrow ? "100%" : "auto" }}>CANCEL</button>
                  {ingestTab === "mills" ? (
                    <button onClick={
  editingRunId
    ? saveEditedRun
    : submitRunDraft
} disabled={uploading} style={{ ...S.primaryBtn, width: isNarrow ? "100%" : "auto", opacity: uploading ? 0.7 : 1 }}>
                      {uploading ? "SAVING…" : "SAVE RUN"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const tabs = ["run", "elevation", "boiler", "flue", "mills"];
                        const currentIdx = tabs.indexOf(ingestTab);
                        setIngestTab(tabs[currentIdx + 1]);
                      }}
                      style={{ ...S.primaryBtn, width: isNarrow ? "100%" : "auto" }}
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
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(20,18,40,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { width: "90%", maxWidth: "360px", padding: "24px", background: "#ffffff", borderRadius: "12px", textAlign: "center", boxShadow: "0 20px 35px -10px rgba(0,0,0,0.2)" },
  modalIcon: { width: "50px", height: "50px", borderRadius: "50%", background: "#16a34a", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", margin: "0 auto 12px" },
  modalTitle: { fontFamily: "'Manrope',sans-serif", fontSize: "24px", letterSpacing: "0.1em", color: "#000" },
  modalText: { fontFamily: "'Inter',sans-serif", fontSize: "15px", color: "#000", marginTop: "8px", letterSpacing: "0.05em" },

  ingestOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(20,18,40,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "stretch", justifyContent: "stretch", padding: 0, zIndex: 200 },
  ingestSheet: { flex: 1, width: "100%", height: "100%", display: "flex", alignItems: "stretch", justifyContent: "center", boxSizing: "border-box" },
  ingestModal: { width: "min(980px,100%)", maxHeight: "min(92vh,860px)", background: "#ffffff", borderRadius: "14px", boxShadow: "0 28px 60px -18px rgba(0,0,0,0.35)", overflow: "hidden", display: "flex", flexDirection: "column" },
  ingestHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", padding: "14px 16px", borderBottom: "1px solid #f0eef8", background: "linear-gradient(180deg,#fbfaff 0%,#ffffff 100%)" },
  ingestTitle: { fontFamily: "'Manrope',sans-serif", fontSize: "22px", letterSpacing: "0.1em", color: "#000" },
  ingestSub: { fontFamily: "'Inter',sans-serif", fontSize: "12px", color: "#000", marginTop: "4px", letterSpacing: "0.08em" },
  ingestClose: { border: "1px solid #eee", background: "#fff", borderRadius: "10px", width: "36px", height: "36px", cursor: "pointer", color: "#000" },
  ingestTabs: { display: "flex", gap: "6px", padding: "10px 12px", borderBottom: "1px solid #f0eef8", flexWrap: "wrap", background: "#ffffff" },
  ingestTabBtn: { border: "0.5px solid #e2e1f0", background: "#fff", fontFamily: "'Inter',sans-serif", fontSize: "11px", letterSpacing: "0.12em", padding: "7px 10px", cursor: "pointer", borderRadius: "10px", color: "#000" },
  ingestTabActive: { background: "#eeeeff", borderColor: "#a5b4fc", color: "#000" },
  ingestBody: { padding: "12px 12px 10px", overflow: "auto" },
  ingestFooter: { padding: "12px 12px", borderTop: "1px solid #f0eef8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", background: "#ffffff" },
  footerHint: { fontFamily: "'Inter',sans-serif", fontSize: "12px", color: "#000", letterSpacing: "0.08em" },
  ingestGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px" },
  ingestToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px", flexWrap: "wrap" },
  helperText: { fontFamily: "'Inter',sans-serif", fontSize: "12px", color: "#000", letterSpacing: "0.06em" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  fieldLabel: { fontFamily: "'Inter',sans-serif", fontSize: "11px", letterSpacing: "0.18em", color: "#000" },
  fieldInput: { width: "100%", border: "1px solid #e8e6f4", borderRadius: "10px", padding: "10px 10px", fontSize: "15px", outline: "none", background: "#fbfaff", boxSizing: "border-box" },
  cellInput: { width: "100%", border: "1px solid #e8e6f4", borderRadius: "8px", padding: "8px 8px", fontSize: "14px", outline: "none", background: "#ffffff" },
  smallBtn: { border: "1px solid #e8e6f4", background: "#ffffff", borderRadius: "10px", padding: "8px 10px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: "12px", letterSpacing: "0.1em", color: "#000" },
  primaryBtn: { border: "none", background: "#4f46e5", color: "#000", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: "12px", letterSpacing: "0.12em" },
  secondaryBtn: { border: "1px solid #e8e6f4", background: "#ffffff", color: "#000", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: "12px", letterSpacing: "0.12em" },

  header: { background: "#ffffff", borderBottom: "1px solid #e8e6f4", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 0 rgba(79,70,229,0.06)" },
  hamburger: { background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", padding: "4px" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", flexWrap: "wrap" },
  hLine: { display: "block", width: "18px", height: "1.5px", background: "#9896c0" },
  logoMark: { width: "36px", height: "36px", border: "1px solid #e2e1f0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5fb", flexShrink: 0 },
  brandName: {
    fontFamily: "Inter, sans-serif",
    fontSize: "19px",
    fontWeight: 900,
    letterSpacing: "0.04em",
    color: "#111827",
    lineHeight: 1.1,
  },
  brandTag: {
    fontFamily: "Inter, sans-serif",
    fontSize: "15px",
    fontWeight: 700,
    color: "#6b7280",
    marginTop: "2px",
    letterSpacing: "0.08em",
  },
  suLabel: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.18em", color: "#000" },
  suVal: { fontFamily: "'Manrope',sans-serif", fontSize: "17px", color: "#000", letterSpacing: "0.08em" },
  adminBadge: { padding: "4px 10px", background: "#4f46e5", color: "#000", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.5px" },
  statsRow: { display: "flex", alignItems: "center", gap: "20px", marginLeft: "auto" },
  statItem: { display: "flex", alignItems: "center", gap: "6px" },
  statN: { fontFamily: "'Manrope',sans-serif", fontSize: "22px", color: "#000", lineHeight: 1 },
  statL: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.15em", color: "#000" },
  logoutButton: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "#dc2626", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", letterSpacing: "0.5px", flexShrink: 0 },

  sidebar: { background: "#ffffff", borderRight: "1px solid #e8e6f4", position: "fixed", left: 0, top: "56px", bottom: 0, overflowY: "auto", transition: "transform 0.3s ease", zIndex: 1000, width: "260px" },
  sideSection: { padding: "16px 14px", borderBottom: "1px solid #f0eef8" },
  secLabel: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.28em", color: "#000", marginBottom: "10px", paddingTop: "2px" },
  uploadBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", background: "#eeeeff", border: "none", borderRadius: "6px", color: "#000", fontFamily: "'Inter',sans-serif", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "8px" },
  downloadBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", background: "#f0fdf4", border: "none", borderRadius: "6px", color: "#000", fontFamily: "'Inter',sans-serif", fontSize: "12px", letterSpacing: "0.15em", cursor: "pointer", boxSizing: "border-box" },

  runSection: { background: "#ffffff", border: "1px solid #e8e6f4", borderRadius: "10px", overflow: "hidden" },
  runHeader: { padding: "12px 14px", borderBottom: "1px solid #f0eef8", background: "#faf9ff" },
  runTitle: { fontFamily: "'Manrope',sans-serif", fontSize: "clamp(14px,1.3vw,18px)", letterSpacing: "0.04em", color: "#000" },
  runSub: { fontFamily: "'Inter',sans-serif", fontSize: "10px", color: "#000", marginTop: "3px", letterSpacing: "0.06em" },
  kpiCard: { background: "#f5f4ff", padding: "7px 4px", textAlign: "center", borderRadius: "4px" },
  kpiVal: { fontFamily: "'Manrope',sans-serif", fontSize: "clamp(14px,3vw,17px)", letterSpacing: "0.05em", lineHeight: 1 },
  kpiLbl: { fontFamily: "'Inter',sans-serif", fontSize: "9px", letterSpacing: "0.15em", color: "#000", marginTop: "3px" },

  tabBar: { display: "flex", gap: "3px", padding: "8px 10px", borderBottom: "1px solid #f0eef8", background: "#faf9ff", flexWrap: "wrap" },
  tabBtn: { border: "0.5px solid #e2e1f0", background: "none", fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.08em", padding: "4px 7px", cursor: "pointer", borderRadius: "4px", color: "#000" },
  tabActive: { background: "#eeeeff", borderColor: "#a5b4fc", color: "#000" },

  downloadRunBtn: { display: "flex", alignItems: "center", gap: "5px", background: "#000", border: "1px solid #bbf7d0", color: "#000", padding: "5px 9px", borderRadius: "6px", fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.1em", flexShrink: 0 },
  deleteBtn: { background: "#fff", border: "1px solid #f0eef8", color: "#000", padding: "5px 9px", borderRadius: "6px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.1em", flexShrink: 0 },

  chartPanel: { padding: "14px", background: "#ffffff" },
  chartLabel: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: "#000", marginBottom: "10px" },
  filterBar: { display: "flex", gap: "4px", marginTop: "10px", flexWrap: "wrap" },
  filterBtn: { border: "0.5px solid", padding: "3px 7px", fontSize: "10px", fontFamily: "'Inter',sans-serif", letterSpacing: "0.07em", cursor: "pointer", borderRadius: "4px" },

  tablePanel: { padding: "14px", background: "#ffffff" },
  subLabel: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: "#000", marginBottom: "10px" },
  table: { width: "100%", borderCollapse: "collapse", fontFamily: "'Inter',sans-serif", fontSize: "12px" },
  th: { padding: "6px 8px", textAlign: "left", fontSize: "10px", letterSpacing: "0.15em", color: "#000", borderBottom: "1px solid #f0eef8", fontWeight: 600 },
  td: { padding: "6px 8px", color: "#000" },
  noData: { fontFamily: "'Inter',sans-serif", fontSize: "12px", color: "#000", padding: "16px 0", letterSpacing: "0.08em" },

  tooltip: { background: "#ffffff", border: "1px solid #e8e6f4", padding: "10px 12px", minWidth: "150px", borderRadius: "6px", boxShadow: "0 4px 20px rgba(79,70,229,0.08)" },
  ttHead: { display: "flex", justifyContent: "space-between", marginBottom: "6px", paddingBottom: "6px", borderBottom: "1px solid #f0eef8" },
  ttLabel: { fontFamily: "'Inter',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: "#000" },
  ttVal: { fontFamily: "'Manrope',sans-serif", fontSize: "16px", color: "#000" },
  ttRow: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" },
  ttDot: { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },
  ttKey: { fontFamily: "'Inter',sans-serif", fontSize: "10px", color: "#000", flex: 1 },
  ttNum: { fontFamily: "'Inter',sans-serif", fontSize: "11px", fontWeight: "700" },

  navBtn: { border: "0.5px solid #e2e1f0", background: "none", fontFamily: "'Inter',sans-serif", fontSize: "11px", letterSpacing: "0.12em", padding: "7px 12px", cursor: "pointer", borderRadius: "4px", color: "#000", textAlign: "left" },
  navBtnActive: { background: "#eeeeff", borderColor: "#a5b4fc", color: "#000" },
  navWrap: {
    height: "72px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "0 24px",
    gap: "20px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  }, navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
};

console.log("App loaded successfully");
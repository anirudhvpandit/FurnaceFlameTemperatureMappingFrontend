import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import img from "./assets/abhitech-logo.png";

const BASE_URL = "https://furnaceflametemperaturemappingbackend.onrender.com";


const COLORS = {
  c1: "#1600d9",
  c2: "#B8860B",
  c3: "#1A6B8A",
  c4: "#6B3FA0",
  avg: "#C0392B",
};

const CORNER_LABELS = {
  c1: "Corner 1",
  c2: "Corner 2",
  c3: "Corner 3",
  c4: "Corner 4",
  avg: "Average",
};

export default function App() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState([]);
  const [datasets, setDatasets] = useState({});
  const [uploading, setUploading] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    c1: true,
    c2: true,
    c3: true,
    c4: true,
    avg: true,
  });
  const [activeTab, setActiveTab] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chartHeight, setChartHeight] = useState(250);

  const getTab = (id) => activeTab[id] ?? "graph";
  const setTab = (id, tab) =>
    setActiveTab((prev) => ({ ...prev, [id]: tab }));

  useEffect(() => {
    const calculateChartHeight = () => {
      const windowHeight = window.innerHeight;
      const newHeight = Math.max(200, Math.min(350, windowHeight * 0.35));
      setChartHeight(newHeight);
    };
    calculateChartHeight();
    window.addEventListener("resize", calculateChartHeight);
    return () => window.removeEventListener("resize", calculateChartHeight);
  }, []);

  useEffect(() => {
    const station = localStorage.getItem("selectedStation");
    const unit = localStorage.getItem("selectedUnit");
    if (station) setSelectedStation(JSON.parse(station));
    if (unit) setSelectedUnit(JSON.parse(unit));
    fetchHistory();
  }, []);

  useEffect(() => {
    if (selected.length > 2) {
      setVisibleLines({ c1: false, c2: false, c3: false, c4: false, avg: true });
    }
  }, [selected]);

  const fetchHistory = async () => {
    const res = await axios.get(`${BASE_URL}/history`);
    setHistory(res.data);
  };

  const toggleLine = (key) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!uploadDate) {
      alert("Please select a date before uploading.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("date", uploadDate);
    await axios.post(`${BASE_URL}/upload`, formData);
    await fetchHistory();
    setUploadDate("");
    setUploading(false);
  };

  const toggleSelection = async (item) => {
    const isSelected = selected.includes(item.id);
    if (isSelected) {
      setSelected((prev) => prev.filter((id) => id !== item.id));
      return;
    }
    if (!datasets[item.id]) {
      
      const res = await axios.get(`${BASE_URL}/history/${item.id}`);
      console.log(res.data);
      
      setDatasets((prev) => ({ ...prev, [item.id]: res.data }));
    }
    setSelected((prev) => [...prev, item.id]);
  };

  const buildRunData = (dataset) =>
    dataset.elevation.map((el, i) => ({
      elevation: Number(el),
      c1: Number(dataset.corner1[i]),
      c2: Number(dataset.corner2[i]),
      c3: Number(dataset.corner3[i]),
      c4: Number(dataset.corner4[i]),
      avg: Number(dataset.average[i]),
    }));

  const renderParametersTable = (dataset) => {
  if (!dataset) return { leftParams: [], rightParams: [], coalMills: [] };
 
  const boilerData = dataset.boiler_mill_parameters;
  const coalData   = dataset.coal_mill_parameters;
 
  // Left side: Main Steam Pressure, Flow, Spray temps, O2, Wind Box, PA Flow
  const leftParams = [];
  const left = boilerData?.left;
  if (left?.parameters?.length) {
    left.parameters.forEach((param, idx) => {
      if (param) {
        leftParams.push({
          label: String(param).trim(),
          left:  left.l_values?.[idx] ?? null,
          right: left.r_values?.[idx] ?? null,
        });
      }
    });
  }
 
  // Right side: FG Temp after DPSH, PSH, RH, HSH, Economizer, APH
  const rightParams = [];
  const right = boilerData?.right;
  if (right?.parameters?.length) {
    right.parameters.forEach((param, idx) => {
      if (param) {
        rightParams.push({
          label: String(param).trim(),
          left:  right.l_values?.[idx] ?? null,
          right: right.r_values?.[idx] ?? null,
        });
      }
    });
  }
 
  // Coal mills — unchanged
  const coalMills = [];
  if (coalData?.parameters?.length) {
    const millLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    millLetters.forEach((mill) => {
      const millKey  = `coal_mill_${mill.toLowerCase()}`;
      const millData = coalData[millKey];
      if (!millData) return;
 
      const obj = { mill };
      coalData.parameters.forEach((param, idx) => {
        if (param) {
          const key = String(param).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
          obj[key] = millData[idx] ?? null;
        }
      });
      coalMills.push(obj);
    });
  }
 
  return { leftParams, rightParams, coalMills };
};
 
 
// ─── BOILER PARAMS TAB JSX ───────────────────────────────────────────────────
// Replace the entire {getTab(id) === "boiler" && ...} block with this:
 


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.tooltip}>
          <div style={styles.tooltipHeader}>
            <span style={styles.tooltipLabel}>ELEVATION</span>
            <span style={styles.tooltipValue}>{label}m</span>
          </div>
          {payload.map((entry) => (
            <div key={entry.dataKey} style={styles.tooltipRow}>
              <span style={{ ...styles.tooltipDot, background: entry.color }} />
              <span style={styles.tooltipKey}>
                {CORNER_LABELS[entry.dataKey] || entry.dataKey}
              </span>
              <span style={{ ...styles.tooltipVal, color: entry.color }}>
                {Number(entry.value).toFixed(1)}°C
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const MetaBanner = ({ meta }) => {
  if (!meta) return null;
  const items = [
    { label: "UNIT",              value: meta.unit },
    { label: "DATE",              value: meta.date },
    { label: "TIME",              value: meta.time },
    { label: "LOAD (MW)",         value: meta.load_mw },
    { label: "COAL FLOW (TPH)",   value: meta.total_coal_flow_tph },
    { label: "AIR FLOW (TPH)",    value: meta.total_air_flow_tph },
    { label: "MILLS IN SERVICE",  value: meta.coal_mills_in_service
                                         ? `${meta.coal_mills_in_service} — ${meta.coal_mills_list || ""}`
                                         : null },
    { label: "OIL GUNS",          value: meta.oil_guns_in_service },
    { label: "BURNER TILT (DEG)", value: meta.burner_tilt_position },
  ].filter(i => i.value !== null && i.value !== undefined && i.value !== "");
 
  if (!items.length) return null;
 
  return (
    <div style={metaBannerStyle.wrap}>
      {items.map(({ label, value }) => (
        <div key={label} style={metaBannerStyle.item}>
          <div style={metaBannerStyle.label}>{label}</div>
          <div style={metaBannerStyle.value}>{String(value)}</div>
        </div>
      ))}
    </div>
  );
};

const metaBannerStyle = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1px",
    borderBottom: "1px solid #e3e3f0",
    background: "#f0f0fa",
  },
  item: {
    padding: "6px 14px",
    borderRight: "1px solid #e3e3f0",
    minWidth: "100px",
    flex: "1 1 auto",
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "8px",
    letterSpacing: "0.18em",
    color: "#84889a",
    textTransform: "uppercase",
    marginBottom: "2px",
  },
  value: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "12px",
    color: "#13121a",
    fontWeight: "500",
  },
};

  return (
    <>
      <div className="heat-bar" />
      <div className="grid-bg" />

      <div className="content" style={{ minHeight: "100vh" }}>

        <header style={styles.header}>
          <div style={styles.headerInner} className="header-inner">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.hamburger}
              className="hamburger"
              aria-label="Toggle sidebar"
            >
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>

            <div style={styles.logoBlock}>
              <div style={styles.logoMark}>
                <img style={styles.logoImage} src={img} alt="Abhitech logo" />
              </div>
              <div>
                <div style={styles.brandName}>ABHITECH FURNACE FLAME TEMPERATURE MAPPING</div>
                <div style={styles.brandTagline}>FURNACE FLAME TEMPERATURE MAPPING SYSTEM</div>
              </div>
            </div>

            {selectedStation && selectedUnit && (
              <div style={styles.stationUnitBlock}>
                <div style={styles.stationUnitLabel}>STATION</div>
                <div style={styles.stationUnitValue}>{selectedStation.name}</div>
                <div style={styles.stationUnitLabel}>UNIT</div>
                <div style={styles.stationUnitValue}>{selectedUnit.name}</div>
              </div>
            )}

            <div style={styles.headerStats}>
              <div style={styles.statItem}>
                <span style={styles.statNum}>{history.length}</span>
                <span style={styles.statLabel}>RUNS LOGGED</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statNum}>{selected.length}</span>
                <span style={styles.statLabel}>SELECTED</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <div className="pulse-dot" />
                <span style={styles.statLabel}>LIVE</span>
              </div>
            </div>
          </div>
        </header>

        <div style={styles.mainLayout}>

          <aside style={styles.sidebar} className={`sidebar ${sidebarOpen ? "open" : ""}`}>
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>INGEST DATA</div>
              <div style={{ marginBottom: "12px" }}>
                <label style={styles.miniLabel}>SELECT DATE</label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
              <label className="upload-zone">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {uploading ? "UPLOADING..." : "UPLOAD EXCEL"}
                <input type="file" onChange={handleUpload} accept=".xlsx" />
              </label>
            </div>

            <div style={{ ...styles.sideSection, borderBottom: "none" }}>
              <div style={styles.sideLabel}>RUN ARCHIVE</div>
              <div style={{ marginBottom: "12px" }}>
                <label style={styles.miniLabel}>FILTER BY DATE</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...styles.dateInput, marginBottom: "6px" }}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>

              <div style={styles.runList}>
                {history.length === 0 && (
                  <div style={styles.emptyState}>No runs found. Upload an Excel file to begin.</div>
                )}
                {history
                  .filter((item) => {
                    if (!startDate && !endDate) return true;
                    const ts = new Date(item.timestamp);
                    if (startDate && ts < new Date(startDate)) return false;
                    if (endDate && ts > new Date(endDate)) return false;
                    return true;
                  })
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className={`run-card ${selected.includes(item.id) ? "active" : ""}`}
                      onClick={() => toggleSelection(item)}
                    >
                      <div className={`checkbox-custom ${selected.includes(item.id) ? "checked" : ""}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.runFileName}>
                          {item.filename.replace(/\.[^/.]+$/, "")}
                        </div>
                        <div style={styles.runMeta}>
                          {new Date(item.timestamp).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(item.timestamp).toLocaleTimeString("en-GB", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div style={{
                        ...styles.runIndex,
                        color: selected.includes(item.id) ? "#0400d9" : "#b5b7c8",
                      }}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </aside>

          <main style={styles.mainContent} className="main-content">

            {selected.length === 0 && (
              <div style={styles.emptyMain}>
                <div style={styles.emptyIcon}>
                  <img style={styles.logoImage} src={img} alt="" />
                </div>
                <div style={styles.emptyTitle}>SELECT A DATE TO ANALYZE</div>
                <div style={styles.emptyBody}>
                  Choose one or more runs from the archive to visualize thermal profiles
                  and compare performance across dates.
                </div>
              </div>
            )}

            <div style={styles.runsWrapper}>
              {selected.map((id, runIdx) => {
                const dataset = datasets[id];
                if (!dataset) return null;

                const runData = buildRunData(dataset);
                const temps = runData.map((r) => r.avg);
                const maxTemp = Math.max(...temps);
                const minTemp = Math.min(...temps);
                const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

                const topRow = runData.reduce(
                  (cur, nxt) => (nxt.elevation > cur.elevation ? nxt : cur),
                  runData[0]
                );
                const peakTemp = Number(topRow.avg);

                const bottomRow = runData.reduce(
                  (cur, nxt) => (nxt.elevation < cur.elevation ? nxt : cur),
                  runData[0]
                );
                const floorTemp = Number(bottomRow.avg);

                const accentHues = ["#0000d9", "#271a8a", "#3f41a0", "#0e0bb8", "#402e7d"];
                const accent = accentHues[runIdx % accentHues.length];

                const coalParams =
                  dataset.coal_mill_parameters?.parameters?.filter(Boolean) ?? [];

                return (
                  <section key={id} style={styles.runSection} className="section-paper">

                    <div style={styles.runHeader}>
                      <div style={styles.runTitleBlock}>
                        <div style={{ ...styles.runAccent, background: accent }} />
                        <div>
                          <div style={styles.runTitle}>
                            {dataset.filename.replace(/\.[^/.]+$/, "").toUpperCase()}
                          </div>
                          <div style={styles.runSubtitle}>{dataset.filename}</div>
                        </div>
                      </div>

                      <div style={styles.runKpis}>
                        {[
                          { label: "PEAK TEMP",          value: `${peakTemp.toFixed(0)}°C`,  color: "#2b2bc0" },
                          { label: "FLOOR TEMP",         value: `${floorTemp.toFixed(0)}°C`, color: "#1a258a" },
                          { label: "MAX TEMP",           value: `${maxTemp.toFixed(0)}°C`,   color: "#c0392b" },
                          { label: "MIN TEMP",           value: `${minTemp.toFixed(0)}°C`,   color: "#0079a1" },
                          { label: "AVG TEMP",           value: `${avgTemp}°C`,              color: "#0e00d9" },
                          { label: "ELEVATIONS",         value: runData.length,              color: "#39355a" },
                        ].map((kpi) => (
                          <div key={kpi.label} style={styles.kpiCard}>
                            <div style={{ ...styles.kpiValue, color: kpi.color }}>{kpi.value}</div>
                            <div style={styles.kpiLabel}>{kpi.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.tabBar}>
                      {[
                        { key: "graph",  label: "GRAPH"         },
                        { key: "raw",    label: "RAW DATA"      }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setTab(id, key)}
                          style={{
                            ...styles.tabBtn,
                            ...(getTab(id) === key ? styles.tabBtnActive : {}),
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {getTab(id) === "graph" && (
                      <div style={styles.chartPanel}>
                        <div style={styles.chartLabel}>
                          THERMAL PROFILE — ELEVATION VS TEMPERATURE
                        </div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                          <LineChart data={runData} layout="vertical">
                            <CartesianGrid strokeDasharray="2 6" vertical />
                            <YAxis dataKey="elevation" reversed />
                            <XAxis
                              type="number"
                              domain={[
                                (dataMin) => dataMin - 100,
                                (dataMax) => dataMax + 100,
                              ]}
                              tick={{ fill: "#84849a", fontSize: 10, fontFamily: "'DM Mono'" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {visibleLines.c1  && <Line type="monotone" dataKey="c1"  stroke={COLORS.c1}  dot={false} strokeWidth={2} />}
                            {visibleLines.c2  && <Line type="monotone" dataKey="c2"  stroke={COLORS.c2}  dot={false} strokeWidth={2} />}
                            {visibleLines.c3  && <Line type="monotone" dataKey="c3"  stroke={COLORS.c3}  dot={false} strokeWidth={2} />}
                            {visibleLines.c4  && <Line type="monotone" dataKey="c4"  stroke={COLORS.c4}  dot={false} strokeWidth={2} />}
                            {visibleLines.avg && <Line type="monotone" dataKey="avg" stroke={COLORS.avg} dot={false} strokeWidth={3} />}
                          </LineChart>
                        </ResponsiveContainer>
                        <div style={styles.filterBar}>
                          {Object.keys(COLORS).map((key) => (
                            <button
                              key={key}
                              onClick={() => toggleLine(key)}
                              style={{
                                ...styles.filterBtn,
                                background: visibleLines[key] ? COLORS[key] : "#e0e0ef",
                                color:      visibleLines[key] ? "#fff"      : "#555",
                              }}
                            >
                              {CORNER_LABELS[key]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {getTab(id) === "raw" && (
  <div style={styles.tablePanel}>
    <div style={styles.chartLabel}>RAW MEASUREMENT DATA</div>
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ELEVATION (M)</th>
            <th>LEVEL LABEL</th>
            <th>CORNER 1</th>
            <th>CORNER 2</th>
            <th>CORNER 3</th>
            <th>CORNER 4</th>
            <th style={{ color: "#1900d9" }}>AVERAGE</th>
          </tr>
        </thead>
        <tbody>
          {dataset.elevation.map((_, i) => (
  <tr key={i}>
    <td>{dataset.elevation[i]}m</td>
    <td style={{ color: "#84859a", fontSize: "10px" }}>
      {dataset.elevation_labels?.[i + 1] || "—"}
    </td>
    <td>{dataset.corner1[i]}</td>
    <td>{dataset.corner2[i]}</td>
    <td>{dataset.corner3[i]}</td>
    <td>{dataset.corner4[i]}</td>
    <td className="avg-col">{dataset.average[i]}</td>
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
    </>
  );
}

const styles = {
  header: {
    borderBottom: "1px solid #d1cfe0",
    background: "rgba(238, 237, 245, 0.95)",
    backdropFilter: "blur(16px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
    boxShadow: "0 1px 0 rgba(14, 0, 217, 0.08), 0 2px 16px rgba(18, 19, 26, 0.05)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 clamp(12px, 3vw, 32px)",
    height: "64px",
    width: "100%",
    flexWrap: "wrap",
    gap: "clamp(8px, 2vw, 16px)",
  },
  hamburger: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "40px",
    height: "40px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    marginRight: "16px",
  },
  hamburgerLine: {
    width: "20px",
    height: "2px",
    background: "#12121a",
    margin: "2px 0",
    transition: "all 0.3s ease",
  },
  logoBlock: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(8px, 2vw, 14px)",
    minWidth: 0,
  },
  logoMark: {
    width: "40px",
    height: "40px",
    border: "1.5px solid rgba(11, 0, 217, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
    background: "rgba(18, 0, 217, 0.05)",
    overflow: "hidden",
  },
  logoImage: {
    maxWidth: "70%",
    maxHeight: "70%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
  },
  brandName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(14px, 2.5vw, 20px)",
    letterSpacing: "0.15em",
    color: "#12121a",
    lineHeight: 1,
  },
  brandTagline: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.2em",
    color: "rgba(18, 0, 217, 0.65)",
    textTransform: "uppercase",
    marginTop: "3px",
  },
  stationUnitBlock: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "clamp(4px, 1vw, 8px)",
    margin: "0 clamp(8px, 2vw, 24px)",
    flexWrap: "wrap",
  },
  stationUnitLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "8px",
    letterSpacing: "0.2em",
    color: "#84889a",
    textTransform: "uppercase",
  },
  stationUnitValue: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "16px",
    color: "#000ed9",
    lineHeight: 1,
  },
  headerStats: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(8px, 2vw, 24px)",
    flexWrap: "wrap",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statNum: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(16px, 2vw, 22px)",
    color: "#000ed9",
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.15em",
    color: "#85849a",
    textTransform: "uppercase",
  },
  statDivider: {
    width: "1px",
    height: "24px",
    background: "#cfd2e0",
  },
  mainLayout: {
    display: "flex",
    minHeight: "calc(100vh - 64px)",
    width: "100%",
    position: "relative",
  },
  sidebar: {
    width: "clamp(200px, 25vw, 280px)",
    flexShrink: 0,
    borderRight: "1px solid #d3cfe0",
    background: "#f8f7fd",
    padding: "clamp(16px, 2vw, 24px) 0",
    overflowY: "auto",
    maxHeight: "calc(100vh - 64px)",
    position: "sticky",
    top: "64px",
    transform: "translateX(0)",
    transition: "transform 0.3s ease",
  },
  sideSection: {
    padding: "0 clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
    borderBottom: "1px solid #e0dfee",
  },
  sideLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.25em",
    color: "rgba(4, 0, 217, 0.55)",
    textTransform: "uppercase",
    marginBottom: "12px",
    paddingTop: "8px",
  },
  miniLabel: {
    display: "block",
    fontSize: "9px",
    color: "#84889a",
    marginBottom: "6px",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  dateInput: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #d1cfe0",
    fontFamily: "'DM Mono', monospace",
    fontSize: "11px",
    marginBottom: "8px",
  },
  runList: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  runFileName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "11px",
    color: "#1d1a2a",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  runMeta: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    color: "#87849a",
    marginTop: "3px",
    letterSpacing: "0.04em",
  },
  runIndex: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "16px",
    letterSpacing: "0.1em",
    transition: "color 0.2s",
  },
  emptyState: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    color: "#a6a8b8",
    lineHeight: 1.7,
    letterSpacing: "0.04em",
  },
  mainContent: {
    flex: 1,
    padding: "clamp(12px, 3vw, 32px) clamp(12px, 4vw, 40px)",
    background: "#ededf5",
    minWidth: 0,
  },
  emptyMain: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
    gap: "clamp(12px, 3vw, 20px)",
    textAlign: "center",
    padding: "clamp(16px, 5vw, 32px)",
  },
  emptyIcon: { opacity: 0.7 },
  emptyTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "20px",
    letterSpacing: "0.2em",
    color: "#b5b7c8",
  },
  emptyBody: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "clamp(11px, 2vw, 13px)",
    color: "#84879a",
    maxWidth: "90%",
    lineHeight: 1.7,
  },
  runsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(8px, 2vw, 12px)",
    width: "100%",
  },
  runSection: {
    marginBottom: "clamp(12px, 2vw, 28px)",
    overflowX: "hidden",
    transition: "box-shadow 0.2s ease",
    width: "100%",
    minWidth: 0,
  },
  runHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "clamp(12px, 2vw, 20px)",
    padding: "clamp(12px, 2vw, 22px) clamp(12px, 2vw, 28px)",
    borderBottom: "1px solid #e3e3f0",
    background: "#f7f8fd",
    flexWrap: "wrap",
  },
  runTitleBlock: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },
  runAccent: {
    width: "3px",
    height: "40px",
    flexShrink: 0,
    marginTop: "2px",
  },
  runTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(14px, 2vw, 22px)",
    letterSpacing: "0.12em",
    color: "#13121a",
    lineHeight: 1,
  },
  runSubtitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    color: "#84859a",
    letterSpacing: "0.08em",
    marginTop: "5px",
  },
  runKpis: {
    display: "flex",
    gap: "1px",
    flexWrap: "wrap",
    width: "100%",
  },
  kpiCard: {
    padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 20px)",
    background: "#eeedf5",
    borderLeft: "1px solid #dfe1ee",
    textAlign: "right",
    minWidth: "clamp(75px, 15vw, 120px)",
    flex: "1 1 auto",
  },
  kpiValue: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(14px, 2vw, 22px)",
    letterSpacing: "0.05em",
    lineHeight: 1,
  },
  kpiLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "8px",
    letterSpacing: "0.2em",
    color: "#84889a",
    textTransform: "uppercase",
    marginTop: "4px",
  },

  // ── Tab bar ──
  tabBar: {
    display: "flex",
    gap: "6px",
    padding: "10px clamp(12px, 2vw, 20px)",
    borderBottom: "1px solid #e3e3f0",
    background: "#f7f8fd",
    flexWrap: "wrap",
  },
  tabBtn: {
    border: "1px solid #d1cfe0",
    background: "#ffffff",
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    padding: "5px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    color: "#84859a",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    background: "#eeeeff",
    borderColor: "#0400d9",
    color: "#0400d9",
  },

  // ── Chart / table panels ──
  chartPanel: {
    padding: "clamp(12px, 2vw, 24px)",
    borderBottom: "1px solid #e3e3f0",
    background: "#ffffff",
    width: "100%",
    boxSizing: "border-box",
    overflowX: "auto",
  },
  chartLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.25em",
    color: "rgba(0, 29, 217, 0.55)",
    textTransform: "uppercase",
    marginBottom: "20px",
  },
  filterBar: {
    display: "flex",
    gap: "clamp(6px, 1vw, 10px)",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  filterBtn: {
    border: "none",
    padding: "clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 12px)",
    fontSize: "clamp(8px, 1.2vw, 10px)",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em",
    cursor: "pointer",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  tablePanel: {
    padding: "clamp(12px, 2vw, 24px)",
    background: "#ffffff",
    overflowX: "auto",
  },
  tooltip: {
    background: "#ffffff",
    border: "1px solid #cfd1e0",
    padding: "12px 16px",
    minWidth: "200px",
    boxShadow: "0 8px 32px rgba(18, 20, 26, 0.12)",
  },
  tooltipHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e3e5f0",
  },
  tooltipLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.2em",
    color: "#84859a",
  },
  tooltipValue: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "16px",
    color: "#0021d9",
    letterSpacing: "0.1em",
  },
  tooltipRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "5px",
  },
  tooltipDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  tooltipKey: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    color: "#88849a",
    flex: 1,
    letterSpacing: "0.08em",
  },
  tooltipVal: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.05em",
  },
};
import { useEffect, useState } from "react";

export default function EventLog() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("grid"); // grid | list

  // ── SIMULATED DATA ──
  useEffect(() => {
    const mock = Array.from({ length: 15 }).map((_, i) => ({
      id: i + 1,
      timestamp: new Date(Date.now() - i * 3600 * 1000),
      file: `run_${1000 + i}.xlsx`,
      station: ["BSL", "CSTPS", "NTPS"][i % 3],
      unit: `Unit ${((i % 5) + 1)}`,
      status: i % 5 === 0 ? "FAILED" : "SUCCESS",
      size: (Math.random() * 5 + 1).toFixed(2) + " MB",
      uploadedBy: ["admin", "operator", "engineer"][i % 3],
    }));

    setLogs(mock);
  }, []);

  const successRate = logs.length
    ? Math.round(
        (logs.filter((l) => l.status === "SUCCESS").length / logs.length) * 100
      )
    : 0;

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.headerRow}>
        <div>
          <div style={S.title}>EVENT LOG</div>
          <div style={S.subtitle}>
            UPLOAD & SYSTEM ACTIVITY TRACKING
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div style={S.toggleWrap}>
          <button
            onClick={() => setView("grid")}
            style={view === "grid" ? S.toggleActive : S.toggleBtn}
          >
            GRID
          </button>
          <button
            onClick={() => setView("list")}
            style={view === "list" ? S.toggleActive : S.toggleBtn}
          >
            LIST
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={S.kpiRow}>
        <KPI label="TOTAL UPLOADS" value={logs.length} />
        <KPI label="SUCCESS RATE" value={`${successRate}%`} />
        <KPI
          label="FAILED"
          value={logs.filter((l) => l.status === "FAILED").length}
          color="#dc2626"
        />
        <KPI label="AVG FILE SIZE" value="3.2 MB" />
      </div>

      {/* CONTENT */}
      <div style={S.tableWrap}>
        {view === "grid" ? (
          <GridView logs={logs} />
        ) : (
          <ListView logs={logs} />
        )}
      </div>
    </div>
  );
}

/* ───────────────── GRID VIEW ───────────────── */
function GridView({ logs }) {
  return (
    <div style={S.grid}>
      {logs.map((log) => (
        <div key={log.id} style={S.card}>
          <div style={S.time}>
            {log.timestamp.toLocaleString()}
          </div>

          <div style={S.file}>{log.file}</div>

          <div style={S.meta}>
            {log.station} • {log.unit}
          </div>

          <div style={S.meta}>
            {log.size} • {log.uploadedBy}
          </div>

          <div
            style={{
              ...S.status,
              color: log.status === "SUCCESS" ? "#16a34a" : "#dc2626",
            }}
          >
            {log.status}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────── LIST VIEW ───────────────── */
function ListView({ logs }) {
  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.th}>TIME</th>
          <th style={S.th}>FILE</th>
          <th style={S.th}>STATION</th>
          <th style={S.th}>UNIT</th>
          <th style={S.th}>SIZE</th>
          <th style={S.th}>USER</th>
          <th style={S.th}>STATUS</th>
        </tr>
      </thead>

      <tbody>
        {logs.map((log) => (
          <tr key={log.id} style={S.tr}>
            <td style={S.td}>
              {log.timestamp.toLocaleString()}
            </td>
            <td style={S.td}>{log.file}</td>
            <td style={S.td}>{log.station}</td>
            <td style={S.td}>{log.unit}</td>
            <td style={S.td}>{log.size}</td>
            <td style={S.td}>{log.uploadedBy}</td>
            <td
              style={{
                ...S.td,
                fontWeight: "600",
                color:
                  log.status === "SUCCESS" ? "#16a34a" : "#dc2626",
              }}
            >
              {log.status}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ───────────────── KPI ───────────────── */
function KPI({ label, value, color = "#4f46e5" }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiValue, color }}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
    </div>
  );
}

/* ───────────────── STYLES ───────────────── */
const S = {
  page: {
    padding: "30px",
    background: "#f4f5fb",
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },

  title: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },

  subtitle: {
    fontSize: "12px",
    color: "#6e6c96",
    letterSpacing: "0.15em",
  },

  toggleWrap: {
    display: "flex",
    gap: "8px",
  },

  toggleBtn: {
    padding: "8px 14px",
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  toggleActive: {
    padding: "8px 14px",
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "24px",
  },

  kpiCard: {
    background: "#fff",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e6e4f2",
  },

  kpiValue: {
    fontSize: "22px",
    fontWeight: "600",
  },

  kpiLabel: {
    fontSize: "10px",
    color: "#9a98b5",
    marginTop: "4px",
    letterSpacing: "0.1em",
  },

  tableWrap: {
    background: "#fff",
    borderRadius: "10px",
    border: "1px solid #e6e4f2",
    overflow: "hidden",
  },

  /* GRID */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
    padding: "12px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e6e4f2",
    borderRadius: "10px",
    padding: "14px",
  },

  time: {
    fontSize: "12px",
    color: "#6e6c96",
  },

  file: {
    fontWeight: "600",
    margin: "6px 0",
  },

  meta: {
    fontSize: "12px",
  },

  status: {
    marginTop: "8px",
    fontWeight: "600",
  },

  /* TABLE */
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    fontSize: "10px",
    padding: "12px",
    background: "#f9f9ff",
    color: "#9a98b5",
    letterSpacing: "0.1em",
  },

  tr: {
    borderBottom: "1px solid #f0eef8",
  },

  td: {
    padding: "12px",
    fontSize: "13px",
  },
};
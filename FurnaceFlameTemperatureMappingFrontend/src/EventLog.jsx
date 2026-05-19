import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = "https://abhiftm.com/api";

export default function EventLog() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("grid");

  // 🔹 FETCH REAL DATA
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/get-upload-log`);
      const data = res.data;

      const formatted = data.map((row) => ({
        id: row.run_id,
        timestamp: new Date(row.run_timestamp),
        file: row.filename,
        station: row.location,
        unit: row.unit
          ? `Unit ${row.unit}`
          : `Unit ${row.unit_id}`,
        status: "SUCCESS", // 🔁 change if you add failure logic
        size: "-", // not available in DB
        uploadedBy: row.uploaded_by,
      }));

      setLogs(formatted);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

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

        {/* TOGGLE */}
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

      {/* KPI */}
      <div style={S.kpiRow}>
        <KPI label="TOTAL UPLOADS" value={logs.length} />
        <KPI label="SUCCESS RATE" value={`${successRate}%`} />
        <KPI
          label="FAILED"
          value={logs.filter((l) => l.status === "FAILED").length}
          color="#000"
        />
        <KPI label="LATEST RUN">
          {logs[0]?.timestamp?.toLocaleDateString() || "-"}
        </KPI>
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

/* ───────── GRID VIEW ───────── */
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
            {log.uploadedBy}
          </div>

          <div
            style={{
              ...S.status,
              color: log.status === "SUCCESS" ? "#000" : "#000",
            }}
          >
            {log.status}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── LIST VIEW ───────── */
function ListView({ logs }) {
  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.th}>TIME</th>
          <th style={S.th}>FILE</th>
          <th style={S.th}>STATION</th>
          <th style={S.th}>UNIT</th>
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
            <td style={S.td}>{log.uploadedBy}</td>
            <td
              style={{
                ...S.td,
                fontWeight: "800",
                color:
                  log.status === "SUCCESS" ? "#000" : "#000",
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

/* ───────── KPI ───────── */
function KPI({ label, value, color = "#000", children }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiValue, color }}>
        {value || children}
      </div>
      <div style={S.kpiLabel}>{label}</div>
    </div>
  );
}

/* ───────── STYLES (UNCHANGED) ───────── */
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
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "0.05em",
  },
  subtitle: {
    fontSize: "14px",
    color: "#000",
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
    fontSize: "14px",
  },
  toggleActive: {
    padding: "8px 14px",
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#000",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
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
    fontSize: "24px",
    fontWeight: "800",
  },
  kpiLabel: {
    fontSize: "12px",
    color: "#000",
    marginTop: "4px",
    letterSpacing: "0.1em",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: "10px",
    border: "1px solid #e6e4f2",
    overflow: "hidden",
  },
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
    fontSize: "14px",
    color: "#000",
  },
  file: {
    fontWeight: "800",
    margin: "6px 0",
  },
  meta: {
    fontSize: "14px",
  },
  status: {
    marginTop: "8px",
    fontWeight: "800",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: "12px",
    padding: "12px",
    background: "#f9f9ff",
    color: "#000",
  },
  tr: {
    borderBottom: "1px solid #f0eef8",
  },
  td: {
    padding: "12px",
    fontSize: "14px",
  },
};
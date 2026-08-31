// src/EventLog.jsx
/**
 * Enhanced EventLog component with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced page layout with gradient background
 *  • Beautiful header with improved typography
 *  • Enhanced toggle buttons with gradient states
 *  • Improved KPI cards with gradients and shadows
 *  • Enhanced grid view with beautiful card design
 *  • Improved list view with better table styling
 *  • Better color scheme and visual hierarchy
 *  • Smooth transitions and hover effects
 *  • Enhanced status indicators
 */

import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = "https://abhiftm.com/api";

export default function EventLog() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("grid");

  // Fetch real data
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
        status: "SUCCESS",
        size: "-",
        uploadedBy: row.uploaded_by,
      }));

      return formatted;
    } catch (err) {
      console.error("Error fetching logs:", err);
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchLogs().then((formatted) => {
      if (!cancelled) setLogs(formatted);
    });
    return () => { cancelled = true; };
  }, []);

  const successRate = logs.length
    ? Math.round(
        (logs.filter((l) => l.status === "SUCCESS").length / logs.length) * 100
      )
    : 0;

  return (
    <div style={S.page}>
      {/* Enhanced Header */}
      <div style={S.headerRow}>
        <div>
          <div style={S.title}>EVENT LOG</div>
          <div style={S.subtitle}>
            UPLOAD & SYSTEM ACTIVITY TRACKING
          </div>
        </div>

        {/* Enhanced Toggle */}
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

      {/* Enhanced KPI */}
      <div style={S.kpiRow}>
        <KPI label="TOTAL UPLOADS" value={logs.length} color="#4f46e5" />
        <KPI label="SUCCESS RATE" value={`${successRate}%`} color="#22c55e" />
        <KPI
          label="FAILED"
          value={logs.filter((l) => l.status === "FAILED").length}
          color="#ef4444"
        />
        <KPI label="LATEST RUN" color="#3b82f6">
          {logs[0]?.timestamp?.toLocaleDateString() || "-"}
        </KPI>
      </div>

      {/* Enhanced Content */}
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

/* ───────── Enhanced GRID VIEW ───────── */
function GridView({ logs }) {
  return (
    <div style={S.grid}>
      {logs.map((log) => (
        <div key={log.id} style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardIcon}>📁</div>
            <div style={getStatusStyle(log.status)}>
              {log.status}
            </div>
          </div>

          <div style={S.time}>
            {log.timestamp.toLocaleString()}
          </div>

          <div style={S.file}>{log.file}</div>

          <div style={S.divider} />

          <div style={S.meta}>
            <span style={S.metaLabel}>Station:</span> {log.station}
          </div>

          <div style={S.meta}>
            <span style={S.metaLabel}>Unit:</span> {log.unit}
          </div>

          <div style={S.meta}>
            <span style={S.metaLabel}>Uploaded by:</span> {log.uploadedBy}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Enhanced LIST VIEW ───────── */
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
            <td style={S.td}>
              <div style={getStatusStyle(log.status)}>
                {log.status}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ───────── Enhanced KPI ───────── */
function KPI({ label, value, color = "#4f46e5", children }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiValue, color }}>
        {value || children}
      </div>
      <div style={S.kpiLabel}>{label}</div>
    </div>
  );
}

/* ───────── UTILITY FUNCTIONS ───────── */
function getStatusStyle(status) {
  const baseStyle = {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase"
  };

  if (status === "SUCCESS") {
    return {
      ...baseStyle,
      background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
      color: "#166534",
      border: "1px solid #86efac"
    };
  } else if (status === "FAILED") {
    return {
      ...baseStyle,
      background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
      color: "#991b1b",
      border: "1px solid #fca5a5"
    };
  }
  return baseStyle;
}

/* ───────── ENHANCED STYLING SYSTEM ───────── */
const S = {
  // Enhanced page layout
  page: {
    padding: "32px",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  // Enhanced header
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px"
  },
  
  title: {
    fontSize: "32px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    color: "#1e293b",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
  },
  
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    letterSpacing: "0.12em",
    marginTop: "4px",
    fontWeight: 500
  },
  
  // Enhanced toggle buttons
  toggleWrap: {
    display: "flex",
    gap: "8px",
    background: "#ffffff",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
  },
  
  toggleBtn: {
    padding: "8px 18px",
    border: "none",
    background: "transparent",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "#64748b",
    transition: "all 0.2s ease"
  },
  
  toggleActive: {
    padding: "8px 18px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
    color: "#ffffff",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
    transition: "all 0.2s ease"
  },
  
  // Enhanced KPI cards
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "28px"
  },
  
  kpiCard: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(79, 70, 229, 0.05)",
    transition: "all 0.2s ease"
  },
  
  kpiValue: {
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "0.02em",
    lineHeight: 1.1
  },
  
  kpiLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "6px",
    letterSpacing: "0.1em",
    fontWeight: 600,
    textTransform: "uppercase"
  },
  
  // Enhanced content wrapper
  tableWrap: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
  },
  
  // Enhanced grid layout
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    padding: "20px"
  },
  
  // Enhanced card design
  card: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
  },
  
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  
  cardIcon: {
    fontSize: "24px",
    opacity: 0.8
  },
  
  time: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "8px",
    letterSpacing: "0.02em"
  },
  
  file: {
    fontWeight: 700,
    fontSize: "15px",
    color: "#1e293b",
    marginBottom: "12px",
    wordBreak: "break-word"
  },
  
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, #e2e8f0 0%, transparent 100%)",
    margin: "12px 0"
  },
  
  meta: {
    fontSize: "13px",
    color: "#475569",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  
  metaLabel: {
    fontWeight: 600,
    color: "#64748b",
    fontSize: "12px"
  },
  
  status: {
    marginTop: "8px",
    fontWeight: 800
  },
  
  // Enhanced table styling
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  
  th: {
    textAlign: "left",
    fontSize: "12px",
    padding: "14px 16px",
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    color: "#475569",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: "2px solid #e2e8f0"
  },
  
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.2s ease"
  },
  
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#475569",
    fontWeight: 500
  }
};
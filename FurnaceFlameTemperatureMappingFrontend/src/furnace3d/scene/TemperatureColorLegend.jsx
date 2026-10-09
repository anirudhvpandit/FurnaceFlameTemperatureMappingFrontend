import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useFurnaceStore } from "../state/FurnaceStore";
import { TEMPERATURE_SCALE_STOPS } from "../utils/temperatureScale";

export default function TemperatureColorLegend() {
  const { state } = useFurnaceStore();
  const { alert, warn } = state.thresholds;
  const stops = useMemo(() => TEMPERATURE_SCALE_STOPS(), []);
  const min = stops[0].t;
  const max = stops[stops.length - 1].t;
  const gradient = stops.map((stop) => {
    const pct = ((stop.t - min) / (max - min)) * 100;
    return `rgb(${stop.color.join(",")}) ${pct}%`;
  }).join(", ");
  const ticks = [...stops].reverse();
  const warnPct = ((warn - min) / (max - min)) * 100;
  const alertPct = ((alert - min) / (max - min)) * 100;

  return (
    <Html fullscreen zIndexRange={[30, 30]}>
      <section
        aria-label="Temperature color scale"
        style={{
          position: "absolute",
          top: "50%",
          right: 16,
          transform: "translateY(-50%)",
          width: 118,
          boxSizing: "border-box",
          padding: "12px 10px",
          color: "#e8f1ff",
          fontFamily: "Inter, system-ui, sans-serif",
          background: "rgba(7, 13, 25, .84)",
          border: "1px solid rgba(148, 184, 230, .2)",
          borderRadius: 10,
          boxShadow: "0 8px 26px rgba(0,0,0,.34)",
          backdropFilter: "blur(8px)",
          pointerEvents: "none",
        }}
      >
        <header style={{ marginBottom: 10, fontSize: 10, fontWeight: 750, letterSpacing: ".08em", color: "#c7d9f4" }}>
          TEMPERATURE <span style={{ color: "#96a9c4" }}>°C</span>
        </header>

        <div style={{ display: "flex", gap: 9, height: 316, alignItems: "stretch" }}>
          <div style={{ position: "relative", width: 18, flex: "0 0 18px", border: "1px solid rgba(255,255,255,.55)", borderRadius: 3, background: `linear-gradient(to top, ${gradient})`, boxShadow: "0 0 12px rgba(88,166,255,.15)" }}>
            {[{ pct: warnPct, color: "#ffe16a" }, { pct: alertPct, color: "#ff7183" }].map((item) => (
              <span key={item.color} style={{ position: "absolute", left: -4, top: `${100 - item.pct}%`, width: 24, height: 2, background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
            ))}
          </div>
          <div style={{ position: "relative", flex: 1, font: "600 9px ui-monospace, SFMono-Regular, monospace", color: "#bdcbe0" }}>
            {ticks.map((tick) => {
              const pct = ((tick.t - min) / (max - min)) * 100;
              return (
                <span key={tick.t} style={{ position: "absolute", right: 0, top: `${100 - pct}%`, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
                  {tick.t}°
                </span>
              );
            })}
          </div>
        </div>

        <footer style={{ display: "grid", gap: 5, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(148,184,230,.14)", color: "#cbd6e6", fontSize: 9, fontWeight: 650 }}>
          <span><i style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ffe16a", marginRight: 5 }} />WARN {warn}°</span>
          <span><i style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ff7183", marginRight: 5 }} />ALERT {alert}°</span>
        </footer>
      </section>
    </Html>
  );
}

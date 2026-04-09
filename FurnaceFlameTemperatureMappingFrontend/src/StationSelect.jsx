import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import img from "./assets/abhitech-logo.png";

export default function StationSelect() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stationsList = [
      { id: 1, name: "BSL" },
      { id: 2, name: "CSTPS" },
      { id: 3, name: "KPKD" },
      { id: 4, name: "KTPS" },
      { id: 5, name: "NTPS" },
      { id: 6, name: "PARAS TPS" },
      { id: 7, name: "PARALI TPS" },
    ];
    setStations(stationsList);

    const username = localStorage.getItem("username");
    if (username) {
      const station = stationsList.find(s => s.name === username);
      if (station) {
        setSelectedStation(station);
        fetchUnits(station.id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedStation", JSON.stringify(selectedStation));
    localStorage.setItem("selectedUnit", JSON.stringify(selectedUnit));
  }, [selectedStation, selectedUnit]);

  const fetchUnits = (stationId) => {
    if (stationId === 1) {
      setUnits([
        { id: 3, name: "Unit 3" },
        { id: 4, name: "Unit 4" },
        { id: 5, name: "Unit 5" },
      ]);
    } else if (stationId === 2) {
      setUnits([
        { id: 3, name: "Unit 3" },
        { id: 4, name: "Unit 4" },
        { id: 5, name: "Unit 5" },
        { id: 6, name: "Unit 6" },
        { id: 7, name: "Unit 7" },
        { id: 8, name: "Unit 8" },
        { id: 9, name: "Unit 9" },
      ]);
    } else if (stationId === 3) {
      setUnits([
        { id: 1, name: "Unit 1" },
        { id: 2, name: "Unit 2" },
        { id: 3, name: "Unit 3" },
        { id: 4, name: "Unit 4" },
        { id: 5, name: "Unit 5" },
      ]);
    } else if (stationId === 4) {
      setUnits([
        { id: 6, name: "Unit 6" },
        { id: 8, name: "Unit 8" },
        { id: 9, name: "Unit 9" },
        { id: 10, name: "Unit 10" },
      ]);
    } else if (stationId === 5) {
      setUnits([
        { id: 3, name: "Unit 3" },
        { id: 4, name: "Unit 4" },
        { id: 5, name: "Unit 5" },
      ]);
    } else if (stationId === 6) {
      setUnits([
        { id: 3, name: "Unit 3" },
        { id: 4, name: "Unit 4" },
      ]);
    } else if (stationId === 7) {
      setUnits([
        { id: 6, name: "Unit 6" },
        { id: 7, name: "Unit 7" },
        { id: 8, name: "Unit 8" },
      ]);
    } else {
      setUnits([]);
    }
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setSelectedUnit(null);
    fetchUnits(station.id);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
  };

  const handleProceed = () => {
    if (selectedStation && selectedUnit) {
      localStorage.setItem("selectedStation", JSON.stringify(selectedStation));
      localStorage.setItem("selectedUnit", JSON.stringify(selectedUnit));
      navigate("/dashboard");
    }
  };

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#ededf5" }}>
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.logoBlock}>
              <div style={styles.logoMark}>
                <img style={styles.logoImage} src={img} />
              </div>
              <div>
                <div style={styles.brandName}>
                  ABHITECH FURNACE FLAME TEMPERATURE MAPPING
                </div>
                <div style={styles.brandTagline}>
                  FURNACE FLAME TEMPERATURE MAPPING SYSTEM
                </div>
              </div>
            </div>
          </div>
        </header>

        <div style={styles.mainContent}>
          <div style={styles.selectionContainer}>
            <div style={styles.selectionTitle}>
              SELECT STATION & UNIT
            </div>

            <div style={styles.selectionSection}>
              <div style={styles.sectionLabel}>STATION</div>
              <div style={styles.buttonGrid}>
                {stations.map((station) => {
                  const isSelected = selectedStation?.id === station.id;
                  const shouldBlur =
                    selectedStation && !isSelected;

                  return (
                    <button
                      key={station.id}
                      onClick={() => handleStationSelect(station)}
                      style={{
                        ...styles.selectionButton,
                        background: isSelected ? "#0000d9" : "#ffffff",
                        color: isSelected ? "#ffffff" : "#12121a",
                        borderColor: isSelected ? "#0000d9" : "#d1cfe0",
                        filter: shouldBlur ? "blur(3px)" : "none",
                        opacity: shouldBlur ? 0.4 : 1,
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {station.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStation && (
              <div style={styles.selectionSection}>
                <div style={styles.sectionLabel}>
                  UNIT — {selectedStation.name}
                </div>

                <div style={styles.buttonGrid}>
                  {units.map((unit) => {
                    const isSelected = selectedUnit?.id === unit.id;
                    const shouldBlur =
                      selectedUnit && !isSelected;

                    return (
                      <button
                        key={unit.id}
                        onClick={() => handleUnitSelect(unit)}
                        style={{
                          ...styles.selectionButton,
                          background: isSelected ? "#0000d9" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#12121a",
                          borderColor: isSelected ? "#0000d9" : "#d1cfe0",
                          filter: shouldBlur ? "blur(3px)" : "none",
                          opacity: shouldBlur ? 0.4 : 1,
                          transform: isSelected ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        {unit.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleProceed}
              disabled={!selectedStation || !selectedUnit}
              style={{
                ...styles.proceedButton,
                background:
                  selectedStation && selectedUnit
                    ? "#0000d9"
                    : "#e0e0ef",
                color:
                  selectedStation && selectedUnit
                    ? "#ffffff"
                    : "#85849a",
              }}
            >
              PROCEED TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  header: {
    borderBottom: "1px solid #d1cfe0",
    background: "rgba(238, 237, 245, 0.95)",
    position: "sticky",
    top: 0,
  },
  headerInner: {
    display: "flex",
    justifyContent: "center",
    padding: "16px",
  },
  logoBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoMark: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
  },
  brandName: {
    fontSize: "16px",
    fontWeight: "bold",
  },
  brandTagline: {
    fontSize: "10px",
    color: "#666",
  },
  mainContent: {
    padding: "40px",
    display: "flex",
    justifyContent: "center",
  },
  selectionContainer: {
    maxWidth: "600px",
    width: "100%",
    textAlign: "center",
  },
  selectionTitle: {
    fontSize: "28px",
    marginBottom: "20px",
  },
  selectionSection: {
    marginBottom: "30px",
  },
  sectionLabel: {
    fontSize: "12px",
    marginBottom: "10px",
  },
  buttonGrid: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  selectionButton: {
    padding: "10px 20px",
    border: "1px solid #ccc",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  proceedButton: {
    padding: "12px 24px",
    border: "none",
    cursor: "pointer",
  },
};
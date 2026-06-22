import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import img from "./assets/abhitech-logo.png";

export default function StationSelect() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // 'admin' or 'user'
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stationsList = [
      { id: 1, name: "BTPS" },
      { id: 2, name: "CSTPS" },
      { id: 3, name: "KPKD" },
      { id: 4, name: "KTPS" },
      { id: 5, name: "NTPS" },
      { id: 6, name: "PARAS TPS" },
      { id: 7, name: "PARALI TPS" },
    ];
    setStations(stationsList);

    const storedUsername = localStorage.getItem("username");
    const storedLocation = localStorage.getItem("location");
    
    setUsername(storedUsername);
    
    // Determine user role
    if (storedLocation === "all") {
      setUserLocation("all");
      // Admin can select any station, so don't auto-select
      setSelectedStation(null);
      setUnits([]);
    } else if (storedLocation && storedLocation !== "all") {
      setUserLocation(storedLocation);
      // Regular user - find their assigned station
      const station = stationsList.find(s => s.name === storedLocation);
      if (station) {
        setSelectedStation(station);
        fetchUnits(station.id);
      }
    } else if (storedUsername) {
      // Fallback: check if username matches a station
      setUserLocation("storedLocation");
      const station = stationsList.find(s => s.name === storedLocation);
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
        {id:6, name: "Unit 6"}
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
    // Only allow station selection if user is admin
    if (userLocation !== "all") {
      return;
    }
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

  const handleLogout = () => {
    // Clear all localStorage items
    localStorage.clear();
    // Navigate to login page
    navigate("/");
  };

  return (
    <>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0c1730 0%, #16223d 45%, #2c4870 100%)" }}>
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.logoBlock}>
              <div style={styles.logoMark}>
                <img style={styles.logoImage} src={img} alt="logo" />
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
            
            {/* User Role Badge */}
            <div style={styles.userInfo}>
              <div style={styles.userRoleBadge}>
                {userLocation === "all" ? "ADMIN" : "👤 USER"}
              </div>
              {username && (
                <div style={styles.usernameDisplay}>
                  {username}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button onClick={handleLogout} style={styles.logoutButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              LOGOUT
            </button>
          </div>
        </header>

        <div style={styles.mainContent}>
          <div style={styles.selectionContainer}>
            <div style={styles.selectionTitle}>
              SELECT STATION & UNIT
            </div>

            {/* Station Selection Section */}
            <div style={styles.selectionSection}>
              <div style={styles.sectionLabel}>
                STATION
                
              </div>
              
              {userLocation !== "all" && selectedStation && (
                <div style={styles.currentStationInfo}>
                  <span>📍 Currently assigned to: </span>
                  <strong>{selectedStation.name}</strong>
                </div>
              )}
              
              <div style={styles.buttonGrid}>
                {stations.map((station) => {
                  const isSelected = selectedStation?.id === station.id;
                  const isDisabled = userLocation !== "all" && !isSelected;
                  const shouldBlur = selectedStation && !isSelected && userLocation !== "all";

                  return (
                    <button
                      key={station.id}
                      onClick={() => handleStationSelect(station)}
                      disabled={isDisabled}
                      style={{
                        ...styles.selectionButton,
                        background: isSelected
                          ? "linear-gradient(90deg, #18243e 0%, #3a5a8c 100%)"
                          : "rgba(255,255,255,0.08)",
                        color: "#ffffff",
                        borderColor: isSelected ? "rgba(124,156,201,0.8)" : "rgba(255,255,255,0.2)",
                        filter: shouldBlur ? "blur(3px)" : "none",
                        opacity: shouldBlur ? 0.4 : isDisabled ? 0.5 : 1,
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {station.name}
                      {isSelected && userLocation !== "all" && (
                        <span style={styles.lockIcon}> </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              
            </div>

            {/* Unit Selection Section */}
            {selectedStation && (
              <div style={styles.selectionSection}>
                <div style={styles.sectionLabel}>
                  UNIT — {selectedStation.name}
                </div>
                <div style={styles.buttonGrid}>
                  {units.map((unit) => {
                    const isSelected = selectedUnit?.id === unit.id;
                    const shouldBlur = selectedUnit && !isSelected;

                    return (
                      <button
                        key={unit.id}
                        onClick={() => handleUnitSelect(unit)}
                        style={{
                          ...styles.selectionButton,
                          background: isSelected
                            ? "linear-gradient(90deg, #18243e 0%, #3a5a8c 100%)"
                            : "rgba(255,255,255,0.08)",
                          color: "#ffffff",
                          borderColor: isSelected ? "rgba(124,156,201,0.8)" : "rgba(255,255,255,0.2)",
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
                    ? "linear-gradient(90deg, #18243e 0%, #3a5a8c 100%)"
                    : "rgba(255,255,255,0.08)",
                color:
                  selectedStation && selectedUnit
                    ? "#ffffff"
                    : "rgba(255,255,255,0.4)",
                cursor: selectedStation && selectedUnit ? "pointer" : "not-allowed",
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
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(90deg, #0d1830 0%, #1c2f4f 55%, #3a5a8c 100%)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    gap: "16px",
    flexWrap: "wrap",
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
    fontSize: "18px",
    fontWeight: "bold",
    color: "#ffffff",
  },
  brandTagline: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.65)",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginLeft: "auto",
  },
  userRoleBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    background: "rgba(124,156,201,0.25)",
    border: "1px solid rgba(124,156,201,0.4)",
    color: "#dbe6f7",
  },
  usernameDisplay: {
    padding: "4px 8px",
    fontSize: "13px",
    color: "#ffffff",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "rgba(220,38,38,0.18)",
    color: "#ffffff",
    border: "1px solid rgba(248,113,113,0.4)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    transition: "all 0.2s ease",
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
    background: "linear-gradient(160deg, rgba(122,140,170,0.4) 0%, rgba(68,93,136,0.45) 100%)",
    border: "1px solid rgba(255,255,255,0.18)",
    backdropFilter: "blur(18px)",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 25px 60px -15px rgba(0,0,0,0.55)",
  },
  selectionTitle: {
    fontSize: "30px",
    marginBottom: "20px",
    color: "#ffffff",
    fontWeight: 800,
    letterSpacing: "0.04em",
  },
  selectionSection: {
    marginBottom: "30px",
  },
  sectionLabel: {
    fontSize: "14px",
    marginBottom: "10px",
    fontWeight: "bold",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: "0.1em",
  },
  lockedBadge: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.6)",
  },
  currentStationInfo: {
    fontSize: "15px",
    marginBottom: "15px",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    display: "inline-block",
    color: "#ffffff",
  },
  restrictionNote: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.6)",
    marginTop: "10px",
    fontStyle: "italic",
  },
  buttonGrid: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  selectionButton: {
    padding: "10px 20px",
    border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    borderRadius: "8px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  lockIcon: {
    fontSize: "12px",
  },
  proceedButton: {
    padding: "14px 24px",
    border: "none",
    cursor: "pointer",
    borderRadius: "12px",
    fontWeight: "800",
    fontSize: "16px",
    transition: "all 0.2s ease",
    marginTop: "20px",
    boxShadow: "0 10px 25px -8px rgba(0,0,0,0.5)",
  },
};
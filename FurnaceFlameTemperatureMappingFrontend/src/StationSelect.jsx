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
      <div style={{ minHeight: "100vh", background: "#ededf5" }}>
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
                        background: isSelected ? "#0000d9" : "#ffffff",
                        color: isSelected ? "#000" : "#000",
                        borderColor: isSelected ? "#000" : "#000",
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
                          background: isSelected ? "#0000d9" : "#ffffff",
                          color: isSelected ? "#000" : "#000",
                          borderColor: isSelected ? "#000" : "#000",
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
                    ? "#000"
                    : "#000",
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
    borderBottom: "1px solid #d1cfe0",
    background: "rgba(238, 237, 245, 0.95)",
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
  },
  brandTagline: {
    fontSize: "12px",
    color: "#000",
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
    background: "#2d3748",
    color: "#000",
  },
  usernameDisplay: {
    padding: "4px 8px",
    fontSize: "13px",
    color: "#000",
    background: "#e2e8f0",
    borderRadius: "6px",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "#dc2626",
    color: "#000",
    border: "none",
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
  },
  selectionTitle: {
    fontSize: "30px",
    marginBottom: "20px",
  },
  selectionSection: {
    marginBottom: "30px",
  },
  sectionLabel: {
    fontSize: "14px",
    marginBottom: "10px",
    fontWeight: "bold",
  },
  lockedBadge: {
    fontSize: "13px",
    color: "#000",
  },
  currentStationInfo: {
    fontSize: "15px",
    marginBottom: "15px",
    padding: "8px 12px",
    background: "#e0f2fe",
    borderRadius: "8px",
    display: "inline-block",
  },
  restrictionNote: {
    fontSize: "13px",
    color: "#000",
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
    border: "1px solid #ccc",
    cursor: "pointer",
    transition: "all 0.2s ease",
    borderRadius: "4px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  lockIcon: {
    fontSize: "12px",
  },
  proceedButton: {
    padding: "12px 24px",
    border: "none",
    cursor: "pointer",
    borderRadius: "6px",
    fontWeight: "800",
    fontSize: "16px",
    transition: "all 0.2s ease",
    marginTop: "20px",
  },
};
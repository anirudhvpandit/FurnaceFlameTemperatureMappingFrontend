import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:8000';
const COLORS = {
  c1: '#1600d9',
  c2: '#B8860B',
  c3: '#1A6B8A',
  c4: '#6B3FA0',
  avg: '#C0392B',
};

const CORNER_LABELS = {
  c1: 'Corner 1',
  c2: 'Corner 2',
  c3: 'Corner 3',
  c4: 'Corner 4',
  avg: 'Average',
};

const DESIGN = {
  colors: {
    primary: '#0e00d9',
    primaryDark: '#1600d9',
    background: '#efedf5',
    backgroundLight: '#f8f7fd',
    backgroundCard: '#f7f8fd',
    text: '#12121a',
    textMuted: '#84889a',
    textLight: '#a6a8b8',
    border: '#d1cfe0',
    borderLight: '#e0dfee',
    danger: '#C0392B',
  },
};

export default function App() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState([]);
  const [datasets, setDatasets] = useState({});
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [visibleLines, setVisibleLines] = useState({
    c1: true,
    c2: true,
    c3: true,
    c4: true,
    avg: true,
  });
  const [viewMode, setViewMode] = useState({});

  useEffect(() => {
    loadSavedStation();
    fetchHistory();
  }, []);

  const loadSavedStation = async () => {
    try {
      await AsyncStorage.getItem('selectedStation');
      await AsyncStorage.getItem('selectedUnit');
    } catch (err) {
      console.warn('AsyncStorage load failed', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/history`);
      setHistory(res.data);
    } catch (err) {
      Alert.alert('Error', 'Cannot fetch history: ' + err.message);
    }
  };

  const toggleSelection = async (item) => {
    const isSelected = selected.includes(item.id);
    if (isSelected) {
      setSelected((prev) => prev.filter((id) => id !== item.id));
      return;
    }

    if (!datasets[item.id]) {
      try {
        const res = await axios.get(`${BASE_URL}/history/${item.id}`);
        setDatasets((prev) => ({ ...prev, [item.id]: res.data }));
      } catch (err) {
        Alert.alert('Error', 'Cannot load run data: ' + err.message);
        return;
      }
    }

    setSelected((prev) => [...prev, item.id]);
  };

  const handleUpload = async () => {
    if (!uploadDate) {
      Alert.alert('Upload date required', 'Choose a date before uploading.');
      return;
    }
    try {
      const file = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (file.type === 'cancel') return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      formData.append('date', uploadDate);

      await axios.post(`${BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadDate('');
      await fetchHistory();
      Alert.alert('Success', 'File uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleLine = (key) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleView = (id) => {
    setViewMode((prev) => ({
      ...prev,
      [id]: prev[id] === 'table' ? 'graph' : 'table',
    }));
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

  const buildComparisonData = () => {
    if (!selected.length) return [];
    const base = datasets[selected[0]];
    if (!base) return [];
    return base.elevation.map((el, i) => {
      let row = { elevation: Number(el) };
      selected.forEach((id) => {
        row[`run_${id}`] = Number(datasets[id]?.average[i]);
      });
      return row;
    });
  };

  const visibleHistory = history.filter((item) => {
    if (!startDate && !endDate) return true;
    const ts = new Date(item.timestamp);
    if (startDate && ts < new Date(startDate)) return false;
    if (endDate && ts > new Date(endDate)) return false;
    return true;
  });

  const renderParametersTable = (dataset) => {
    if (!dataset) return null;

    const boilerData = dataset.boiler_mill_parameters;
    const coalData = dataset.coal_mill_parameters;

    const boilerParams = [];
    if (boilerData && boilerData.parameters && Array.isArray(boilerData.parameters)) {
      boilerData.parameters.forEach((param, idx) => {
        if (param !== null && param !== undefined && param !== "") {
          const leftVal = boilerData.l_values[idx];
          const rightVal = boilerData.r_values;
          boilerParams.push({
            label: String(param).trim(),
            left: leftVal !== null && leftVal !== undefined ? leftVal : "",
            right: rightVal !== null && rightVal !== undefined ? rightVal : "",
          });
        }
      });
    }

    const coalMills = [];
    if (coalData && coalData.parameters && Array.isArray(coalData.parameters)) {
      const millLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      millLetters.forEach((mill) => {
        const millKey = `coal_mill_${mill.toLowerCase()}`;
        const millData = coalData[millKey] || [];
        const millObj = { mill };
        
        coalData.parameters.forEach((param, idx) => {
          if (param !== null && param !== undefined && param !== "") {
            const paramKey = String(param).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
            millObj[paramKey] = millData[idx] !== null && millData[idx] !== undefined ? millData[idx] : "-";
          }
        });
        coalMills.push(millObj);
      });
    }

    return { boilerParams, coalMills };
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.colors.background} />

      <View style={styles.heatBar} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>FURNACE FLAME MAPPING</Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{history.length}</Text>
            <Text style={styles.statLabel}>RUNS LOGGED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selected.length}</Text>
            <Text style={styles.statLabel}>SELECTED</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainLayout}>
        <ScrollView style={styles.sidebar}>
          <View style={styles.sideSection}>
            <Text style={styles.sideLabel}>INGEST DATA</Text>
            <TextInput
              style={styles.dateInput}
              value={uploadDate}
              onChangeText={setUploadDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={DESIGN.colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              <Text style={styles.uploadButtonText}>
                {uploading ? 'UPLOADING...' : 'UPLOAD EXCEL'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sideSection}>
            <Text style={styles.sideLabel}>RUN ARCHIVE</Text>
            <Text style={styles.filterLabel}>FILTER BY DATE</Text>
            <TextInput
              style={styles.dateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="Start YYYY-MM-DD"
              placeholderTextColor={DESIGN.colors.textMuted}
            />
            <TextInput
              style={styles.dateInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="End YYYY-MM-DD"
              placeholderTextColor={DESIGN.colors.textMuted}
            />
          </View>

          <View style={[styles.sideSection, { borderBottom: 'none', flex: 1 }]}>
            {visibleHistory.length === 0 ? (
              <Text style={styles.emptyState}>No runs found. Upload an Excel file to begin.</Text>
            ) : (
              visibleHistory.map((item, index) => {
                const isActive = selected.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.runCard, isActive && styles.runCardActive]}
                    onPress={() => toggleSelection(item)}
                  >
                    <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                      {isActive && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.runFileName}>
                        {item.filename.replace(/\.[^/.]+$/, '')}
                      </Text>
                      <Text style={styles.runMeta}>
                        {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.runIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <ScrollView style={styles.mainContent}>
          {selected.length === 0 && (
            <View style={styles.emptyMain}>
              <Text style={styles.emptyTitle}>SELECT A DATE TO ANALYZE</Text>
              <Text style={styles.emptyBody}>
                Choose one or more runs from the dates to visualize thermal profiles and compare performance across dates.
              </Text>
            </View>
          )}

          {selected.map((id, runIdx) => {
            const dataset = datasets[id];
            if (!dataset) return null;

            const runData = buildRunData(dataset);
            const temps = runData.map((r) => r.avg);
            const maxTemp = Math.max(...temps);
            const minTemp = Math.min(...temps);
            const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

            const topRow = runData.reduce(
              (current, next) => (next.elevation > current.elevation ? next : current),
              runData[0]
            );
            const peakTemp = Number(topRow.avg);

            const bottomRow = runData.reduce(
              (current, next) => (next.elevation < current.elevation ? next : current),
              runData[0]
            );
            const floorTemp = Number(bottomRow.avg);

            const accentHues = ['#0000d9', '#271a8a', '#3f41a0', '#0e0bb8', '#402e7d'];
            const accent = accentHues[runIdx % accentHues.length];

            const kpis = [
              { label: 'PEAK TEMP', value: `${peakTemp.toFixed(0)}°C`, color: '#2b2bc0' },
              { label: 'FLOOR TEMP', value: `${floorTemp.toFixed(0)}°C`, color: '#1a258a' },
              { label: 'MAX TEMP', value: `${maxTemp.toFixed(0)}°C`, color: '#c0392b' },
              { label: 'MIN TEMP', value: `${minTemp.toFixed(0)}°C`, color: '#0079a1' },
              { label: 'AVG TEMP', value: `${avgTemp}°C`, color: '#0e00d9' },
              { label: 'ELEVATIONS', value: runData.length, color: '#39355a' },
            ];

            const chartData = {
              labels: runData.map((row) => `${row.elevation}`),
              datasets: [
                ...(visibleLines.c1 ? [{ data: runData.map((r) => r.c1), color: () => COLORS.c1, strokeWidth: 2 }] : []),
                ...(visibleLines.c2 ? [{ data: runData.map((r) => r.c2), color: () => COLORS.c2, strokeWidth: 2 }] : []),
                ...(visibleLines.c3 ? [{ data: runData.map((r) => r.c3), color: () => COLORS.c3, strokeWidth: 2 }] : []),
                ...(visibleLines.c4 ? [{ data: runData.map((r) => r.c4), color: () => COLORS.c4, strokeWidth: 2 }] : []),
                ...(visibleLines.avg ? [{ data: runData.map((r) => r.avg), color: () => COLORS.avg, strokeWidth: 3 }] : []),
              ],
            };

            return (
              <View key={id} style={styles.runSection}>
                <View style={[styles.runHeader, { borderLeftColor: accent }]}>
                  <TouchableOpacity
                    style={styles.viewToggle}
                    onPress={() => toggleView(id)}
                  >
                    <Text style={styles.viewToggleText}>
                      {viewMode[id] === 'table' ? 'SHOW GRAPH' : 'SHOW TABLE'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.runTitleBlock}>
                    <View style={[styles.accentBar, { backgroundColor: accent }]} />
                    <View>
                      <Text style={styles.runTitle}>
                        {dataset.filename.replace(/\.[^/.]+$/, '').toUpperCase()}
                      </Text>
                      <Text style={styles.runSubtitle}>{dataset.filename}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.kpiGrid}>
                  {kpis.map((kpi) => (
                    <View key={kpi.label} style={styles.kpiCard}>
                      <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                      <Text style={styles.kpiLabel}>{kpi.label}</Text>
                    </View>
                  ))}
                </View>

                {viewMode[id] === 'table' ? (
                  <View style={styles.tablePanel}>
                    <Text style={styles.chartLabel}>RAW MEASUREMENT DATA</Text>
                    <ScrollView horizontal>
                      <View>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderCell, { width: 70 }]}>ELEV</Text>
                          <Text style={[styles.tableHeaderCell, { width: 70 }]}>C1</Text>
                          <Text style={[styles.tableHeaderCell, { width: 70 }]}>C2</Text>
                          <Text style={[styles.tableHeaderCell, { width: 70 }]}>C3</Text>
                          <Text style={[styles.tableHeaderCell, { width: 70 }]}>C4</Text>
                          <Text style={[styles.tableHeaderCell, { width: 70, color: '#1900d9' }]}>AVG</Text>
                        </View>
                        {dataset.elevation.map((_, i) => (
                          <View key={i} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: 70 }]}>{dataset.elevation[i]}m</Text>
                            <Text style={[styles.tableCell, { width: 70 }]}>{dataset.corner1[i]}</Text>
                            <Text style={[styles.tableCell, { width: 70 }]}>{dataset.corner2[i]}</Text>
                            <Text style={[styles.tableCell, { width: 70 }]}>{dataset.corner3[i]}</Text>
                            <Text style={[styles.tableCell, { width: 70 }]}>{dataset.corner4[i]}</Text>
                            <Text style={[styles.tableCell, { width: 70, color: '#1900d9', fontWeight: '600' }]}>{dataset.average[i]}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    {dataset && (() => {
                      const paramsData = renderParametersTable(dataset);
                      
                      return (
                        <>
                          <View style={{ marginTop: 20 }}>
                            <Text style={styles.chartLabel}>BOILER & MILL PARAMETERS</Text>
                            <ScrollView horizontal>
                              <View>
                                <View style={styles.tableHeader}>
                                  <Text style={[styles.tableHeaderCell, { width: 150 }]}>PARAMETER</Text>
                                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>VALUE</Text>
                                </View>
                                {paramsData.boilerParams.map((param, i) => (
                                  <View key={i} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: 150 }]}>{param.label}</Text>
                                    <Text style={[styles.tableCell, { width: 120 }]}>
                                      {param.left || param.right
                                        ? `L:${param.left || "-"}|R:${param.right || "-"}`
                                        : "-"}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </ScrollView>
                          </View>

                          {/* Coal Mill Parameters */}
                          <View style={{ marginTop: 20 }}>
                            <Text style={styles.chartLabel}>COAL MILL PARAMETERS</Text>
                            <ScrollView horizontal>
                              <View>
                                <View style={styles.tableHeader}>
                                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>MILL</Text>
                                  {dataset.coal_mill_parameters?.parameters?.filter(p => p)?.map((param, i) => (
                                    <Text key={i} style={[styles.tableHeaderCell, { width: 100 }]}>
                                      {String(param).substring(0, 15)}
                                    </Text>
                                  ))}
                                </View>
                                {paramsData.coalMills.map((mill, i) => (
                                  <View key={i} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: 100 }]}>Mill {mill.mill}</Text>
                                    {dataset.coal_mill_parameters?.parameters?.filter(p => p)?.map((param, j) => {
                                      const key = String(param).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
                                      return (
                                        <Text key={j} style={[styles.tableCell, { width: 100 }]}>
                                          {mill[key] || '-'}
                                        </Text>
                                      );
                                    })}
                                  </View>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                ) : (
                  <View style={styles.chartPanel}>
                    <Text style={styles.chartLabel}>THERMAL PROFILE — ELEVATION VS TEMPERATURE</Text>
                    <LineChart
                      data={chartData}
                      width={Dimensions.get('window').width - 220}
                      height={220}
                      yAxisSuffix="°C"
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                    />
                    <View style={styles.filterBar}>
                      {Object.keys(COLORS).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.filterBtn,
                            {
                              backgroundColor: visibleLines[key] ? COLORS[key] : '#e0e0ef',
                            },
                          ]}
                          onPress={() => toggleLine(key)}
                        >
                          <Text style={[styles.filterBtnText, { color: visibleLines[key] ? '#fff' : '#555' }]}>
                            {CORNER_LABELS[key]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {selected.length > 1 && (
            <View style={styles.runSection}>
              <Text style={styles.runTitle}>COMPARISON</Text>
              <Text style={styles.chartLabel}>AVERAGE TEMPERATURE COMPARISON</Text>
              <Text style={styles.emptyBody}>Multiple run comparison - view in chart mode above</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


const chartConfig = {
  backgroundGradientFrom: DESIGN.colors.backgroundLight,
  backgroundGradientTo: DESIGN.colors.backgroundLight,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(14, 0, 217, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(132, 136, 154, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '3', strokeWidth: '1.5', stroke: DESIGN.colors.primary },
  propsForLabels: { fontSize: 9 },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.background,
  },
  heatBar: {
    height: 3,
    backgroundColor: DESIGN.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#4e1ae8',
  },
  header: {
    backgroundColor: DESIGN.colors.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.primary,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: DESIGN.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: DESIGN.colors.borderLight,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: DESIGN.colors.backgroundLight,
    borderRightWidth: 1,
    borderRightColor: DESIGN.colors.border,
    padding: 8,
  },
  sideSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.borderLight,
  },
  sideLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN.colors.primary,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: DESIGN.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dateInput: {
    height: 32,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
    color: DESIGN.colors.text,
    marginBottom: 6,
  },
  uploadButton: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.primary,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: DESIGN.colors.primary,
    marginTop: 4,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  runCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
    borderRadius: 4,
  },
  runCardActive: {
    backgroundColor: '#edecfe',
    borderColor: 'rgba(69, 0, 217, 0.3)',
    borderLeftColor: DESIGN.colors.primaryDark,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(51, 0, 217, 0.35)',
    borderRadius: 2,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: DESIGN.colors.primary,
    borderColor: DESIGN.colors.primaryDark,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  runFileName: {
    fontSize: 9,
    fontWeight: '600',
    color: DESIGN.colors.text,
  },
  runMeta: {
    fontSize: 8,
    color: DESIGN.colors.textMuted,
    marginTop: 2,
  },
  runIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN.colors.textMuted,
  },
  emptyState: {
    fontSize: 10,
    color: DESIGN.colors.textLight,
    fontStyle: 'italic',
  },
  mainContent: {
    flex: 1,
    backgroundColor: DESIGN.colors.background,
    padding: 8,
  },
  emptyMain: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 11,
    color: DESIGN.colors.textLight,
    lineHeight: 18,
    textAlign: 'center',
  },
 runSection: {
  marginBottom: 16,
  borderRadius: 12,
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e6e8f0',
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
  overflow: 'hidden',
},
  runHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: '#fafbff',
  borderBottomWidth: 1,
  borderBottomColor: '#eef1f6',
  borderLeftWidth: 4,
  gap: 10,
},
  viewToggle: {
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 3,
  },
  viewToggleText: {
    fontSize: 8,
    fontWeight: '600',
    color: DESIGN.colors.text,
    letterSpacing: 0.6,
  },
  runTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  accentBar: {
    width: 3,
    height: 30,
    marginTop: 2,
  },
  runTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN.colors.text,
  },
  runSubtitle: {
    fontSize: 8,
    color: DESIGN.colors.textMuted,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4,
  },
  kpiCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: DESIGN.colors.backgroundLight,
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 7,
    fontWeight: '500',
    color: DESIGN.colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tablePanel: {
    padding: 10,
    backgroundColor: '#fafafa',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f4f3fe',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(43, 0, 217, 0.15)',
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(33, 0, 217, 0.75)',
    textAlign: 'right',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e3f0',
  },
  tableCell: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#37354a',
    textAlign: 'right',
  },
  chartPanel: {
    padding: 10,
    backgroundColor: '#fafafa',
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN.colors.text,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chart: {
    borderRadius: 12,
    marginBottom: 8,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  filterBtnText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});

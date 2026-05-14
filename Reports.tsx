import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Dimensions, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from "react-native-chart-kit";
import { Calendar, DateData } from 'react-native-calendars';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const screenWidth = Dimensions.get("window").width;
const BASE_URL = "http://192.168.1.2:3000";

interface AttendanceRecord {
  roll_no: string;
  name: string;
  subject_name: string;
  status: string;
  date: string;
}

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0];

// Build marked dates object for calendar range highlighting
const buildMarkedDates = (start: string, end: string) => {
  const marked: any = {};
  if (!start) return marked;

  const startDate = new Date(start);
  const endDate   = end ? new Date(end) : startDate;

  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const isStart = dateStr === start;
    const isEnd   = dateStr === end || (!end && isStart);

    marked[dateStr] = {
      color:         '#0f7a4a',
      textColor:     '#fff',
      startingDay:   isStart,
      endingDay:     isEnd,
    };
    current.setDate(current.getDate() + 1);
  }
  return marked;
};

export default function Reports() {
  const router = useRouter();

  const [loading, setLoading]               = useState(true);
  const [stats, setStats]                   = useState({ present: 0, absent: 0, total_students: 0, total_days: 0 });
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate,   setEndDate]   = useState(today);

  // Calendar modal state
  const [showCalendar, setShowCalendar]   = useState(false);
  const [selectingFor, setSelectingFor]   = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart]         = useState(firstOfMonth);
  const [tempEnd,   setTempEnd]           = useState(today);

  useEffect(() => { loadAllData(startDate, endDate); }, []);

  const loadAllData = async (start: string, end: string) => {
    try {
      setLoading(true);
      const [statsRes, reportRes] = await Promise.all([
        fetch(`${BASE_URL}/api/attendance-stats`),
        fetch(`${BASE_URL}/api/attendance-report?startDate=${start}&endDate=${end}`),
      ]);
      const statsData  = await statsRes.json();
      const reportData = await reportRes.json();
      setStats({
        present:        statsData.present        || 0,
        absent:         statsData.absent          || 0,
        total_students: statsData.total_students  || 0,
        total_days:     statsData.total_days      || 0,
      });
      setAttendanceData(Array.isArray(reportData) ? reportData : []);
    } catch {
      Alert.alert("Connection Error", "Check if backend is running at " + BASE_URL);
    } finally {
      setLoading(false);
    }
  };

  // When user taps a day on the calendar
  const onDayPress = (day: DateData) => {
    if (selectingFor === 'start') {
      setTempStart(day.dateString);
      setTempEnd('');           // reset end when start changes
      setSelectingFor('end');   // next tap selects end
    } else {
      if (day.dateString < tempStart) {
        // If they tap before start, restart selection
        setTempStart(day.dateString);
        setTempEnd('');
        setSelectingFor('end');
      } else {
        setTempEnd(day.dateString);
        setSelectingFor('start'); // reset for next open
      }
    }
  };

  const applyDates = () => {
    if (!tempStart || !tempEnd) {
      Alert.alert("Incomplete", "Please select both a start and end date.");
      return;
    }
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setShowCalendar(false);
    loadAllData(tempStart, tempEnd);
  };

  const openCalendar = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setSelectingFor('start');
    setShowCalendar(true);
  };

  const chartData = [
    { name: "Present", population: stats.present || 0, color: "#0f7a4a", legendFontColor: "#555", legendFontSize: 13 },
    { name: "Absent",  population: stats.absent  || 0, color: "#d32f2f", legendFontColor: "#555", legendFontSize: 13 },
  ].filter(d => d.population > 0);

  const generatePDF = async () => {
    if (attendanceData.length === 0) {
      Alert.alert("No Data", "No records to export for this date range.");
      return;
    }
    const html = `
      <html><head><style>
        body{font-family:sans-serif;padding:20px}
        h1{text-align:center;color:#0f7a4a}
        p{text-align:center;color:#666;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ddd;padding:10px;font-size:12px;text-align:left}
        th{background:#0f7a4a;color:#fff}
        .P{color:#0f7a4a;font-weight:bold}
        .A{color:#d32f2f;font-weight:bold}
      </style></head><body>
        <h1>Attendance Report</h1>
        <p>Period: ${startDate} to ${endDate}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <tr><th>Roll No</th><th>Name</th><th>Subject</th><th>Status</th><th>Date</th></tr>
          ${attendanceData.map(i => `
            <tr>
              <td>${i.roll_no}</td><td>${i.name}</td>
              <td>${i.subject_name||'General'}</td>
              <td class="${i.status==='Present'?'P':'A'}">${i.status}</td>
              <td>${i.date}</td>
            </tr>`).join('')}
        </table>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      Alert.alert("Error", "Could not generate PDF: " + e.message);
    }
  };

  const exportCSV = async () => {
    if (attendanceData.length === 0) {
      Alert.alert("No Data", "No records to export for this date range.");
      return;
    }
    try {
      let csv = "Roll No,Name,Subject,Status,Date\n";
      attendanceData.forEach(i => {
        csv += `"${i.roll_no}","${i.name}","${i.subject_name||'General'}","${i.status}","${i.date}"\n`;
      });
      const filePath = `${FileSystem.documentDirectory}Attendance_${startDate}_${endDate}.csv`;
      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert("Saved!", `File saved to:\n${filePath}`); return; }
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Attendance CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e: any) {
      Alert.alert("Export Failed", e.message || "Could not generate CSV");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f7a4a" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading from database...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Reports</Text>
        <TouchableOpacity onPress={() => loadAllData(startDate, endDate)}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Filter Bar */}
      <TouchableOpacity style={styles.filterBar} onPress={openCalendar}>
        <Ionicons name="calendar" size={20} color="#0f7a4a" />
        <View style={{ flex: 1 }}>
          <Text style={styles.filterLabel}>Date Range</Text>
          <Text style={styles.filterText}>{startDate}  →  {endDate}</Text>
        </View>
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>📅 Pick Dates</Text>
        </View>
      </TouchableOpacity>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.statNum, { color: '#2e7d32' }]}>{stats.present}</Text>
          <Text style={[styles.statLabel, { color: '#2e7d32' }]}>Present</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
          <Text style={[styles.statNum, { color: '#c62828' }]}>{stats.absent}</Text>
          <Text style={[styles.statLabel, { color: '#c62828' }]}>Absent</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={[styles.statNum, { color: '#1565c0' }]}>{stats.total_students}</Text>
          <Text style={[styles.statLabel, { color: '#1565c0' }]}>Students</Text>
        </View>
      </View>

      {/* Pie Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Monthly Overview</Text>
        {(stats.present + stats.absent) > 0 ? (
          <PieChart
            data={chartData}
            width={screenWidth - 80}
            height={200}
            chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <View style={styles.emptyChart}>
            <MaterialCommunityIcons name="chart-pie" size={50} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 10 }}>No records this month</Text>
          </View>
        )}
      </View>

      {/* Records List */}
      {attendanceData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Records ({attendanceData.length})</Text>
          {attendanceData.slice(0, 10).map((item, idx) => (
            <View key={idx} style={styles.recordRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordName}>{item.name}</Text>
                <Text style={styles.recordRoll}>{item.roll_no} • {item.subject_name || 'General'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.recordDate}>{item.date}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'Present' ? '#e8f5e9' : '#ffebee' }]}>
                  <Text style={{ color: item.status === 'Present' ? '#2e7d32' : '#c62828', fontSize: 11, fontWeight: 'bold' }}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {attendanceData.length > 10 && (
            <Text style={{ color: '#999', textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              +{attendanceData.length - 10} more in export
            </Text>
          )}
        </View>
      )}

      {/* Export */}
      <View style={styles.exportCard}>
        <Text style={styles.sectionTitle}>Export Report</Text>
        <Text style={styles.subText}>{startDate}  to  {endDate}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}>
            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
            <Text style={styles.btnText}>Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.csvBtn} onPress={exportCSV}>
            <MaterialCommunityIcons name="file-excel-box" size={24} color="#fff" />
            <Text style={styles.btnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* ✅ Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: selectingFor === 'start' ? '#0f7a4a' : '#ccc' }]}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: selectingFor === 'start' ? '#0f7a4a' : '#999' }]}>
                {selectingFor === 'start' ? '👆 Tap to select START date' : `Start: ${tempStart}`}
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: selectingFor === 'end' ? '#0f7a4a' : '#ccc' }]}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: selectingFor === 'end' ? '#0f7a4a' : '#999' }]}>
                {selectingFor === 'end'
                  ? '👆 Tap to select END date'
                  : tempEnd ? `End: ${tempEnd}` : 'End: not selected'}
              </Text>
            </View>

            {/* Calendar */}
            <Calendar
              onDayPress={onDayPress}
              markingType="period"
              markedDates={buildMarkedDates(tempStart, tempEnd)}
              maxDate={today}
              theme={{
                todayTextColor:           '#0f7a4a',
                selectedDayBackgroundColor: '#0f7a4a',
                arrowColor:               '#0f7a4a',
                dotColor:                 '#0f7a4a',
                monthTextColor:           '#333',
                textDayFontWeight:        '500',
                textMonthFontWeight:      'bold',
                textDayHeaderFontWeight:  '600',
              }}
            />

            {/* Quick Presets */}
            <Text style={styles.presetTitle}>Quick Select</Text>
            <View style={styles.presetsRow}>
              {[
                { label: 'This Month',   start: firstOfMonth, end: today },
                { label: 'Last 7 Days',  start: new Date(Date.now()-6*86400000).toISOString().split('T')[0], end: today },
                { label: 'Last 30 Days', start: new Date(Date.now()-29*86400000).toISOString().split('T')[0], end: today },
              ].map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.presetBtn}
                  onPress={() => { setTempStart(p.start); setTempEnd(p.end); setSelectingFor('start'); }}
                >
                  <Text style={styles.presetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyBtn, (!tempStart || !tempEnd) && { opacity: 0.5 }]}
              onPress={applyDates}
              disabled={!tempStart || !tempEnd}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f4f7f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:         { backgroundColor: '#0f7a4a', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:    { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  filterBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, padding: 16, borderRadius: 16, elevation: 3, gap: 12 },
  filterLabel:    { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  filterText:     { fontSize: 14, color: '#333', fontWeight: '700', marginTop: 2 },
  filterBadge:    { backgroundColor: '#0f7a4a15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  filterBadgeText:{ color: '#0f7a4a', fontSize: 12, fontWeight: 'bold' },

  statsRow:   { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, gap: 10 },
  statCard:   { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum:    { fontSize: 26, fontWeight: 'bold' },
  statLabel:  { fontSize: 11, fontWeight: '600', marginTop: 3 },

  card:         { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, padding: 20, borderRadius: 20, elevation: 3 },
  exportCard:   { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, padding: 20, borderRadius: 20, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subText:      { fontSize: 12, color: '#888', marginBottom: 15 },
  emptyChart:   { height: 160, justifyContent: 'center', alignItems: 'center' },

  recordRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  recordName: { fontSize: 14, fontWeight: '600', color: '#333' },
  recordRoll: { fontSize: 12, color: '#888', marginTop: 2 },
  recordDate: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  buttonRow: { flexDirection: 'row', gap: 10 },
  pdfBtn:    { flex: 1, backgroundColor: '#d32f2f', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  csvBtn:    { flex: 1, backgroundColor: '#1c8c5b', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText:   { color: '#fff', fontWeight: 'bold' },

  // Calendar Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 30 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: '#333' },

  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNum:   { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stepText:  { fontSize: 13, fontWeight: '600' },

  presetTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 8 },
  presetsRow:  { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  presetBtn:   { backgroundColor: '#0f7a4a15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  presetText:  { color: '#0f7a4a', fontSize: 12, fontWeight: '600' },

  applyBtn:     { backgroundColor: '#0f7a4a', padding: 16, borderRadius: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

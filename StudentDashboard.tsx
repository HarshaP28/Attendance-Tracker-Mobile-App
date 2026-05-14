import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BASE_URL = "http://192.168.1.2:3000";

interface AttendanceData {
  name: string;
  roll_no: string;
  attended: number;
  total_days: number;
  percentage: number;
}

interface SubjectData {
  subject_name: string;
  attended: number;
  total_classes: number;
  percentage: number;
}

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName, usn, userPhoto } = useLocalSearchParams();

  const [attendance, setAttendance]   = useState<AttendanceData | null>(null);
  const [subjects,   setSubjects]     = useState<SubjectData[]>([]);
  const [loading,    setLoading]      = useState(true);
  const [shortage,   setShortage]     = useState(false);

  useEffect(() => {
    if (usn) fetchAttendance();
  }, [usn]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      // Fetch overall attendance
      const res  = await fetch(`${BASE_URL}/api/student-attendance/${usn}`);
      const data = await res.json();
      setAttendance(data);

      // Fetch subject-wise
      const subRes  = await fetch(`${BASE_URL}/api/admin/student-report/${usn}`);
      const subData = await subRes.json();
      setSubjects(Array.isArray(subData) ? subData : []);

      // Check if below 75% and show popup
      if (data.percentage !== null && data.percentage < 75) {
        setShortage(true);
        // Show popup alert once on login
        setTimeout(() => {
          Alert.alert(
            "⚠️ Attendance Warning",
            `Your attendance is ${data.percentage}% which is below the required 75%.\n\nPlease attend more classes to avoid detention.`,
            [{ text: "I Understand", style: "destructive" }]
          );
        }, 500);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const goToPanel = () => {
    router.push({
      pathname: '/StudentPanel' as any,
      params: { userName, usn, userPhoto }
    });
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return '#0f7a4a';
    if (pct >= 60) return '#ff8f00';
    return '#d32f2f';
  };

  const renderRow = (sub: string, cls: number, att: number, miss: number, per: number) => (
    <View style={styles.row} key={sub}>
      <Text style={{ flex: 2.5, fontSize: 12 }}>{sub}</Text>
      <Text style={{ flex: 1, textAlign: 'center' }}>{cls}</Text>
      <Text style={{ flex: 1, textAlign: 'center', color: "green" }}>{att}</Text>
      <Text style={{ flex: 1, textAlign: 'center', color: "red" }}>{miss}</Text>
      <Text style={[{ flex: 1.2, textAlign: 'right', fontWeight: 'bold' }, { color: getPercentageColor(per) }]}>
        {per}%
      </Text>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Student Dashboard</Text>
          <TouchableOpacity onPress={goToPanel} style={styles.menuButton}>
            <MaterialCommunityIcons name="dots-horizontal" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.profile}>
          <Image
            source={{ uri: (userPhoto ? String(userPhoto) : "https://i.pravatar.cc/100") }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.welcome}>Welcome, <Text style={{ fontWeight: "bold" }}>{userName || 'Student'}</Text></Text>
            <Text style={styles.rollNo}>Roll No: {usn || 'N/A'}</Text>
          </View>
        </View>

        {/* ✅ RED WARNING BANNER — shows if below 75% */}
        {shortage && (
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning" size={22} color="#fff" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.warningTitle}>Attendance Shortage!</Text>
              <Text style={styles.warningSubtitle}>
                Your attendance is below 75%. You may be detained. Please meet your coordinator.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.section}>● Attendance Overview</Text>

        {loading ? (
          <View style={styles.attendanceBox}>
            <ActivityIndicator color="#0f7a4a" />
          </View>
        ) : (
          <View style={styles.attendanceBox}>
            <View style={styles.statGroup}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.bold}>{attendance?.total_days ?? 0}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Attended</Text>
                <Text style={[styles.bold, { color: "green" }]}>{attendance?.attended ?? 0}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Missed</Text>
                <Text style={[styles.bold, { color: "red" }]}>
                  {(attendance?.total_days ?? 0) - (attendance?.attended ?? 0)}
                </Text>
              </View>
            </View>
            <Text style={[
              { fontSize: 20, fontWeight: 'bold' },
              { color: getPercentageColor(attendance?.percentage ?? 0) }
            ]}>
              {attendance?.percentage ?? 0}%
            </Text>
          </View>
        )}

        <Text style={styles.section}>● Subject-wise Attendance</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#ddd' }]}>
            <Text style={{ flex: 2.5, fontSize: 11, color: '#888', fontWeight: '700' }}>Subject</Text>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#888', fontWeight: '700' }}>Total</Text>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#888', fontWeight: '700' }}>Att</Text>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#888', fontWeight: '700' }}>Miss</Text>
            <Text style={{ flex: 1.2, textAlign: 'right', fontSize: 11, color: '#888', fontWeight: '700' }}>%</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#0f7a4a" style={{ marginVertical: 20 }} />
          ) : subjects.length > 0 ? (
            subjects.map(s => renderRow(
              s.subject_name,
              s.total_classes,
              s.attended,
              s.total_classes - s.attended,
              s.percentage ?? 0
            ))
          ) : (
            <Text style={{ color: '#999', textAlign: 'center', padding: 20 }}>
              No subject data yet
            </Text>
          )}
        </View>

        {/* Shortage subjects warning */}
        {subjects.filter(s => s.percentage < 75).length > 0 && (
          <View style={styles.subjectWarning}>
            <Text style={styles.subjectWarningTitle}>⚠ Shortage in:</Text>
            {subjects.filter(s => s.percentage < 75).map(s => (
              <Text key={s.subject_name} style={styles.subjectWarningText}>
                • {s.subject_name} — {s.percentage}%
              </Text>
            ))}
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.history}
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/StudentHistory' as any,
              params: { studentRollNo: usn }
            })}
          >
            <MaterialIcons name="history" size={20} color="#333" />
            <Text style={{ marginLeft: 5 }}>🕒 History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leave}
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/StudentLeaveRequest' as any,
              params: { studentName: userName, studentRoll: usn }
            })}
          >
            <Text style={{ color: "#fff", marginRight: 5 }}>📧 Leave</Text>
            <MaterialIcons name="mail" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer:  { flex: 1, backgroundColor: "#f1f2f6" },
  container:      { flex: 1, paddingHorizontal: 15 },
  header:         { backgroundColor: "#0f7a4a", padding: 15, flexDirection: "row", justifyContent: "space-between", borderRadius: 12, marginTop: 10, alignItems: 'center' },
  headerTitle:    { color: "#fff", fontWeight: "bold", fontSize: 17 },
  menuButton:     { padding: 5 },
  profile:        { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  avatar:         { width: 65, height: 65, borderRadius: 32.5, marginRight: 15, borderWidth: 2, borderColor: '#0f7a4a' },
  welcome:        { fontSize: 18 },
  rollNo:         { fontSize: 14, color: '#666' },

  // ✅ Red warning banner
  warningBanner: {
    backgroundColor: '#d32f2f',
    padding: 15, borderRadius: 12,
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 10, elevation: 4,
  },
  warningTitle:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  warningSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 3 },

  section:        { marginTop: 20, marginBottom: 10, fontWeight: "bold" },
  attendanceBox:  { backgroundColor: "#fff", padding: 18, borderRadius: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 3 },
  statGroup:      { flexDirection: 'row', flex: 1, justifyContent: 'space-around' },
  stat:           { alignItems: "center" },
  statLabel:      { fontSize: 11, color: '#7f8c8d' },
  bold:           { fontWeight: "bold", fontSize: 18 },
  table:          { backgroundColor: "#fff", borderRadius: 12, padding: 10, elevation: 3 },
  row:            { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f1f1', alignItems: 'center' },

  subjectWarning:      { backgroundColor: "#ffecec", padding: 15, borderRadius: 10, marginTop: 15 },
  subjectWarningTitle: { color: "#d32f2f", fontWeight: 'bold', marginBottom: 5 },
  subjectWarningText:  { color: "#d32f2f", fontSize: 13, marginTop: 3 },

  buttons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  history: { backgroundColor: "#e0e0e0", padding: 14, borderRadius: 10, flexDirection: "row", flex: 0.48, justifyContent: 'center', alignItems: 'center' },
  leave:   { backgroundColor: "#0f7a4a", padding: 14, borderRadius: 10, flexDirection: "row", flex: 0.48, justifyContent: 'center', alignItems: 'center' }
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Alert, ActivityIndicator, TextInput, Modal, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BASE_URL  = "http://192.168.1.2:3000";
const { width } = Dimensions.get('window');

const ADMIN_COLOR = '#6a0dad';
const ADMIN_DARK  = '#4a0080';

interface ClassRecord {
  student_id: number;
  name: string;
  roll_no: string;
  email: string;
  attended: number;
  total_days: number;
  percentage: number;
}

interface SubjectRecord {
  subject_name: string;
  attended: number;
  total_classes: number;
  percentage: number;
}

export default function AdminReports() {
  const router = useRouter();

  const [activeTab,       setActiveTab]       = useState<'class' | 'student'>('class');
  const [classData,       setClassData]       = useState<ClassRecord[]>([]);
  const [subjectData,     setSubjectData]     = useState<SubjectRecord[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [sending,         setSending]         = useState(false);
  const [searchRoll,      setSearchRoll]      = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ClassRecord | null>(null);
  const [showPicker,      setShowPicker]      = useState(false);
  const [filter,          setFilter]          = useState<'all' | 'shortage'>('all');

  useEffect(() => { fetchClassReport(); }, []);

  const fetchClassReport = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${BASE_URL}/api/admin/class-report`);
      const data = await res.json();
      setClassData(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Could not load class report");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentReport = async (roll_no: string) => {
    try {
      setLoading(true);
      setSubjectData([]);
      const res  = await fetch(`${BASE_URL}/api/admin/student-report/${roll_no}`);
      const data = await res.json();
      setSubjectData(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Could not load student report");
    } finally {
      setLoading(false);
    }
  };

  const sendNotifications = async () => {
    const shortageCount = classData.filter(s => s.percentage < 75).length;
    if (shortageCount === 0) {
      Alert.alert("All Good!", "No students are below 75% attendance.");
      return;
    }

    Alert.alert(
      "Send Notifications",
      `This will send warning emails to ${shortageCount} student(s) below 75%. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Now", onPress: async () => {
            try {
              setSending(true);
              const res  = await fetch(`${BASE_URL}/api/admin/send-shortage-notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              const data = await res.json();
              Alert.alert(
                data.success ? "✅ Done!" : "❌ Error",
                data.message || "Something went wrong"
              );
            } catch {
              Alert.alert("Error", "Could not send notifications. Check your server.");
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  const getColor = (pct: number) => {
    if (pct >= 75) return '#2e7d32';
    if (pct >= 60) return '#ff8f00';
    return '#d32f2f';
  };

  const getBg = (pct: number) => {
    if (pct >= 75) return '#e8f5e9';
    if (pct >= 60) return '#fff8e1';
    return '#ffebee';
  };

  const filteredClass = filter === 'shortage'
    ? classData.filter(s => s.percentage < 75)
    : classData;

  // ─── Class Report Tab ────────────────────────────────────────────────────────
  const renderClassReport = () => (
    <View style={{ flex: 1 }}>
      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.summaryNum, { color: '#2e7d32' }]}>
            {classData.filter(s => s.percentage >= 75).length}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#2e7d32' }]}>Above 75%</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#ffebee' }]}>
          <Text style={[styles.summaryNum, { color: '#d32f2f' }]}>
            {classData.filter(s => s.percentage < 75).length}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#d32f2f' }]}>Below 75%</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#e3f2fd' }]}>
          <Text style={[styles.summaryNum, { color: '#1565c0' }]}>{classData.length}</Text>
          <Text style={[styles.summaryLabel, { color: '#1565c0' }]}>Total</Text>
        </View>
      </View>

      {/* Filter + Notify Row */}
      <View style={styles.actionRow}>
        <View style={styles.filterToggle}>
          {(['all', 'shortage'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && { color: '#fff' }]}>
                {f === 'all' ? 'All Students' : '⚠ Shortage Only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.notifyBtn, sending && { opacity: 0.6 }]}
          onPress={sendNotifications}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="mail" size={16} color="#fff" />
              <Text style={styles.notifyBtnText}>Notify</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Student List */}
      {loading ? (
        <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredClass}
          keyExtractor={item => item.student_id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={fetchClassReport}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {filter === 'shortage' ? 'No students below 75% 🎉' : 'No students found.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={[styles.avatarCircle, { backgroundColor: getBg(item.percentage) }]}>
                <Text style={[styles.avatarText, { color: getColor(item.percentage) }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentRoll}>{item.roll_no}</Text>
                <Text style={styles.studentEmail}>{item.email}</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${Math.min(item.percentage, 100)}%` as any,
                    backgroundColor: getColor(item.percentage)
                  }]} />
                </View>
                <Text style={styles.attendedText}>
                  {item.attended} / {item.total_days} days attended
                </Text>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: getBg(item.percentage) }]}>
                <Text style={[styles.percentText, { color: getColor(item.percentage) }]}>
                  {item.percentage ?? 0}%
                </Text>
                {item.percentage < 75 && (
                  <Text style={{ fontSize: 9, color: '#d32f2f', fontWeight: 'bold' }}>⚠ LOW</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Student Report Tab ──────────────────────────────────────────────────────
  const renderStudentReport = () => (
    <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
      {/* Search / Select Student */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Select a Student</Text>
        <TouchableOpacity style={styles.searchInput} onPress={() => setShowPicker(true)}>
          <Ionicons name="search" size={18} color="#888" />
          <Text style={{ flex: 1, marginLeft: 10, color: selectedStudent ? '#333' : '#999' }}>
            {selectedStudent ? `${selectedStudent.name} (${selectedStudent.roll_no})` : 'Tap to select student...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Student Summary */}
      {selectedStudent && (
        <>
          <View style={styles.studentSummaryCard}>
            <View style={[styles.bigAvatar, { backgroundColor: getBg(selectedStudent.percentage) }]}>
              <Text style={[styles.bigAvatarText, { color: getColor(selectedStudent.percentage) }]}>
                {selectedStudent.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.studentSummaryName}>{selectedStudent.name}</Text>
            <Text style={styles.studentSummaryRoll}>{selectedStudent.roll_no}</Text>
            <Text style={[styles.bigPercent, { color: getColor(selectedStudent.percentage) }]}>
              {selectedStudent.percentage ?? 0}%
            </Text>
            <Text style={styles.studentSummaryDays}>
              {selectedStudent.attended} / {selectedStudent.total_days} days
            </Text>
            {selectedStudent.percentage < 75 && (
              <View style={styles.shortageAlert}>
                <Ionicons name="warning" size={16} color="#d32f2f" />
                <Text style={styles.shortageAlertText}>Below 75% — At Risk of Detention</Text>
              </View>
            )}
          </View>

          {/* Subject breakdown */}
          <Text style={styles.subjectTitle}>Subject-wise Breakdown</Text>
          {loading ? (
            <ActivityIndicator color={ADMIN_COLOR} />
          ) : subjectData.length > 0 ? (
            subjectData.map((item, idx) => (
              <View key={idx} style={styles.subjectCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{item.subject_name}</Text>
                  <Text style={styles.subjectDays}>{item.attended} / {item.total_classes} classes</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${Math.min(item.percentage ?? 0, 100)}%` as any,
                      backgroundColor: getColor(item.percentage ?? 0)
                    }]} />
                  </View>
                </View>
                <View style={[styles.percentBadge, { backgroundColor: getBg(item.percentage ?? 0) }]}>
                  <Text style={[styles.percentText, { color: getColor(item.percentage ?? 0) }]}>
                    {item.percentage ?? 0}%
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No subject data found.</Text>
          )}
        </>
      )}

      {!selectedStudent && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-search" size={70} color="#ddd" />
          <Text style={styles.emptyStateText}>Select a student to view their detailed attendance report</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Attendance Reports</Text>
        <TouchableOpacity onPress={fetchClassReport}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'class' && styles.tabActive]}
          onPress={() => setActiveTab('class')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'class' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'class' && styles.tabTextActive]}>
            Class Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'student' && styles.tabActive]}
          onPress={() => setActiveTab('student')}
        >
          <Ionicons name="person" size={16} color={activeTab === 'student' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'student' && styles.tabTextActive]}>
            Student Report
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: '#faf5ff' }}>
        {activeTab === 'class'   ? renderClassReport()   : renderStudentReport()}
      </View>

      {/* Student Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search by name or roll no..."
              value={searchRoll}
              onChangeText={setSearchRoll}
              placeholderTextColor="#aaa"
            />
            <FlatList
              data={classData.filter(s =>
                s.name.toLowerCase().includes(searchRoll.toLowerCase()) ||
                s.roll_no.toLowerCase().includes(searchRoll.toLowerCase())
              )}
              keyExtractor={item => item.student_id.toString()}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedStudent(item);
                    setShowPicker(false);
                    setSearchRoll('');
                    fetchStudentReport(item.roll_no);
                  }}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: getBg(item.percentage) }]}>
                    <Text style={[{ fontWeight: 'bold', color: getColor(item.percentage) }]}>
                      {item.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    <Text style={styles.pickerRoll}>{item.roll_no}</Text>
                  </View>
                  <Text style={[styles.pickerPct, { color: getColor(item.percentage) }]}>
                    {item.percentage ?? 0}%
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No students found</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#faf5ff' },
  header:       { backgroundColor: ADMIN_DARK, paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  tabRow:       { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  tabActive:    { backgroundColor: ADMIN_COLOR, borderBottomWidth: 3, borderBottomColor: ADMIN_DARK },
  tabText:      { color: '#888', fontWeight: '600', fontSize: 13 },
  tabTextActive:{ color: '#fff', fontWeight: 'bold' },

  summaryRow:   { flexDirection: 'row', margin: 15, gap: 10 },
  summaryBox:   { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryNum:   { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 3 },

  actionRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 5, gap: 10 },
  filterToggle: { flex: 1, flexDirection: 'row', backgroundColor: '#f0e6ff', borderRadius: 12, overflow: 'hidden' },
  filterBtn:    { flex: 1, paddingVertical: 9, alignItems: 'center' },
  filterBtnActive: { backgroundColor: ADMIN_COLOR },
  filterBtnText:{ fontSize: 12, fontWeight: '600', color: '#888' },

  notifyBtn:    { backgroundColor: '#d32f2f', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6 },
  notifyBtnText:{ color: '#fff', fontWeight: 'bold', fontSize: 12 },

  studentCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: 18, fontWeight: 'bold' },
  studentName:  { fontSize: 15, fontWeight: '700', color: '#222' },
  studentRoll:  { fontSize: 12, color: '#888', marginTop: 1 },
  studentEmail: { fontSize: 11, color: '#aaa' },
  attendedText: { fontSize: 11, color: '#888', marginTop: 3 },
  progressBg:   { height: 5, backgroundColor: '#eee', borderRadius: 4, marginTop: 5, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 4 },
  percentBadge: { alignItems: 'center', padding: 10, borderRadius: 12, minWidth: 55 },
  percentText:  { fontSize: 16, fontWeight: 'bold' },

  emptyText:    { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },

  // Student report
  searchCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2 },
  searchTitle:  { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  searchInput:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },

  studentSummaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 15, elevation: 3 },
  bigAvatar:     { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  bigAvatarText: { fontSize: 32, fontWeight: 'bold' },
  studentSummaryName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  studentSummaryRoll: { fontSize: 14, color: '#888', marginTop: 3 },
  bigPercent:    { fontSize: 40, fontWeight: 'bold', marginTop: 10 },
  studentSummaryDays: { fontSize: 13, color: '#888', marginTop: 4 },
  shortageAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', padding: 10, borderRadius: 10, marginTop: 12, gap: 6 },
  shortageAlertText: { color: '#d32f2f', fontWeight: '600', fontSize: 13 },

  subjectTitle:  { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subjectCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  subjectName:   { fontSize: 14, fontWeight: '600', color: '#333' },
  subjectDays:   { fontSize: 12, color: '#888', marginTop: 2 },

  emptyState:     { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyStateText: { color: '#bbb', textAlign: 'center', fontSize: 15, marginTop: 15, lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalSearch:  { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, marginBottom: 10, color: '#333' },
  pickerItem:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  pickerAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  pickerName:   { fontSize: 14, fontWeight: '600', color: '#333' },
  pickerRoll:   { fontSize: 12, color: '#888' },
  pickerPct:    { fontSize: 16, fontWeight: 'bold' },
});

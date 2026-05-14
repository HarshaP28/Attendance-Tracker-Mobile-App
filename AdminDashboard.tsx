import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, FlatList, StatusBar, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BASE_URL = "http://192.168.1.2:3000";

// ─── Purple/Dark theme for Admin ─────────────────────────────────────────────
const ADMIN_COLOR   = '#6a0dad';   // deep purple
const ADMIN_DARK    = '#4a0080';   // darker purple
const ADMIN_ACCENT  = '#ff6f00';   // amber accent
const ADMIN_LIGHT   = '#f3e5f5';   // light purple bg

type TabType = 'home' | 'students' | 'lecturers' | 'attendance' | 'leaves';

interface Student    { student_id: number; name: string; roll_no: string; email: string; phone: string; }
interface Lecturer   { lecturer_id: number; name: string; email: string; phone: string; department: string; subject_specialization: string; }
interface LeaveReq   { id: number; student_name: string; student_roll_no: string; leave_date: string; reason: string; subject_name: string; status: string; }
interface AttRecord  { record_id: number; name: string; roll_no: string; subject_name: string; status: string; date: string; }
interface Summary    { total_students: number; total_lecturers: number; total_attendance: number; pending_leaves: number; today_present: number; }

export default function AdminDashboard() {
  const router  = useRouter();
  const { adminName } = useLocalSearchParams();

  const [activeTab,    setActiveTab]    = useState<TabType>('home');
  const [loading,      setLoading]      = useState(false);
  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [students,     setStudents]     = useState<Student[]>([]);
  const [lecturers,    setLecturers]    = useState<Lecturer[]>([]);
  const [leaves,       setLeaves]       = useState<LeaveReq[]>([]);
  const [attendance,   setAttendance]   = useState<AttRecord[]>([]);
  const [leaveTab,     setLeaveTab]     = useState<'Pending' | 'Processed'>('Pending');

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => {
    if (activeTab === 'students')   fetchStudents();
    if (activeTab === 'lecturers')  fetchLecturers();
    if (activeTab === 'leaves')     fetchLeaves();
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab]);

  const fetchSummary = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/admin/summary`);
      const data = await res.json();
      setSummary(data);
    } catch { Alert.alert("Error", "Could not load summary"); }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/students`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch { Alert.alert("Error", "Could not load students"); }
    finally { setLoading(false); }
  };

  const fetchLecturers = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/admin/lecturers`);
      const data = await res.json();
      setLecturers(Array.isArray(data) ? data : []);
    } catch { Alert.alert("Error", "Could not load lecturers"); }
    finally { setLoading(false); }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/leave-requests`);
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch { Alert.alert("Error", "Could not load leave requests"); }
    finally { setLoading(false); }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/admin/attendance`);
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch { Alert.alert("Error", "Could not load attendance"); }
    finally { setLoading(false); }
  };

  const deleteStudent = (id: number, name: string) => {
    Alert.alert("Delete Student", `Remove ${name} permanently?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await fetch(`${BASE_URL}/api/admin/students/${id}`, { method: 'DELETE' });
        fetchStudents();
        fetchSummary();
      }},
    ]);
  };

  const deleteLecturer = (id: number, name: string) => {
    Alert.alert("Delete Lecturer", `Remove ${name} permanently?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await fetch(`${BASE_URL}/api/admin/lecturers/${id}`, { method: 'DELETE' });
        fetchLecturers();
        fetchSummary();
      }},
    ]);
  };

  const deleteAttendance = (id: number) => {
    Alert.alert("Delete Record", "Remove this attendance record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await fetch(`${BASE_URL}/api/admin/attendance/${id}`, { method: 'DELETE' });
        fetchAttendance();
        fetchSummary();
      }},
    ]);
  };

  const updateLeave = async (id: number, status: string) => {
    await fetch(`${BASE_URL}/api/leave-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchLeaves();
    fetchSummary();
  };

  // ─── RENDER SECTIONS ────────────────────────────────────────────────────────

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <View style={styles.adminBadge}>
          <FontAwesome5 name="user-shield" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeSmall}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{adminName || 'Admin'}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>SUPER ADMIN</Text>
          </View>
        </View>
      </View>

      {/* Summary Grid */}
      <Text style={styles.sectionTitle}>System Overview</Text>
      {summary ? (
        <View style={styles.summaryGrid}>
          {[
            { label: 'Students',       value: summary.total_students,  icon: 'people',          color: '#1565c0', bg: '#e3f2fd' },
            { label: 'Lecturers',      value: summary.total_lecturers, icon: 'school',          color: '#2e7d32', bg: '#e8f5e9' },
            { label: "Today Present",  value: summary.today_present,   icon: 'checkmark-circle',color: '#0f7a4a', bg: '#e8f5e9' },
            { label: 'Pending Leaves', value: summary.pending_leaves,  icon: 'mail',            color: '#e65100', bg: '#fff3e0' },
            { label: 'Total Records',  value: summary.total_attendance,icon: 'calendar',        color: ADMIN_COLOR, bg: ADMIN_LIGHT },
          ].map((item, idx) => (
            <View key={idx} style={[styles.summaryCard, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={26} color={item.color} />
              <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 20 }} />
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {[
          { label: 'Manage Students',  icon: 'people',       tab: 'students'   as TabType, color: '#1565c0' },
          { label: 'Manage Lecturers', icon: 'school',       tab: 'lecturers'  as TabType, color: '#2e7d32' },
          { label: 'Attendance Logs',  icon: 'calendar',     tab: 'attendance' as TabType, color: ADMIN_COLOR },
          { label: 'Leave Requests',   icon: 'mail-unread',  tab: 'leaves'     as TabType, color: '#e65100' },
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.quickBtn, { borderLeftColor: item.color }]}
            onPress={() => setActiveTab(item.tab)}
          >
            <Ionicons name={item.icon as any} size={22} color={item.color} />
            <Text style={[styles.quickBtnText, { color: item.color }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => {
        Alert.alert("Logout", "Sign out of Admin?", [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", onPress: () => router.replace('/LoginScreen') },
        ]);
      }}>
        <Ionicons name="log-out-outline" size={22} color="#d32f2f" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStudents = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.listHeader}>
        {students.length} Registered Students
      </Text>
      {loading ? <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 30 }} /> : (
        <FlatList
          data={students}
          keyExtractor={item => item.student_id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={[styles.listAvatar, { backgroundColor: ADMIN_LIGHT }]}>
                <Text style={[styles.listAvatarText, { color: ADMIN_COLOR }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listSub}>Roll: {item.roll_no}</Text>
                <Text style={styles.listSub}>{item.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteStudent(item.student_id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
        />
      )}
    </View>
  );

  const renderLecturers = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.listHeader}>{lecturers.length} Registered Lecturers</Text>
      {loading ? <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 30 }} /> : (
        <FlatList
          data={lecturers}
          keyExtractor={item => item.lecturer_id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={[styles.listAvatar, { backgroundColor: '#e8f5e9' }]}>
                <Text style={[styles.listAvatarText, { color: '#2e7d32' }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listSub}>{item.department} — {item.subject_specialization}</Text>
                <Text style={styles.listSub}>{item.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteLecturer(item.lecturer_id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No lecturers found.</Text>}
        />
      )}
    </View>
  );

  const renderAttendance = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.listHeader}>Last 100 Attendance Records</Text>
      {loading ? <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 30 }} /> : (
        <FlatList
          data={attendance}
          keyExtractor={item => item.record_id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listSub}>{item.roll_no} • {item.subject_name}</Text>
                <Text style={styles.listSub}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === 'Present' ? '#e8f5e9' : '#ffebee'
                }]}>
                  <Text style={{
                    color: item.status === 'Present' ? '#2e7d32' : '#c62828',
                    fontSize: 11, fontWeight: 'bold'
                  }}>{item.status}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteAttendance(item.record_id)}>
                  <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No attendance records.</Text>}
        />
      )}
    </View>
  );

  const renderLeaves = () => {
    const filtered = leaves.filter(l =>
      leaveTab === 'Pending' ? l.status === 'Pending' : l.status !== 'Pending'
    );
    return (
      <View style={{ flex: 1 }}>
        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {(['Pending', 'Processed'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, leaveTab === t && styles.tabBtnActive]}
              onPress={() => setLeaveTab(t)}
            >
              <Text style={[styles.tabBtnText, leaveTab === t && styles.tabBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={ADMIN_COLOR} style={{ marginTop: 30 }} /> : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <View style={styles.leaveCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{item.student_name}</Text>
                  <Text style={styles.listSub}>{item.student_roll_no} • {item.subject_name}</Text>
                  <Text style={styles.listSub}>Date: {item.leave_date?.split('T')[0]}</Text>
                  <Text style={[styles.listSub, { fontStyle: 'italic', marginTop: 4 }]}>
                    "{item.reason}"
                  </Text>
                </View>
                {item.status === 'Pending' ? (
                  <View style={styles.leaveActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => updateLeave(item.id, 'Approved')}
                    >
                      <Text style={styles.actionText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => updateLeave(item.id, 'Rejected')}
                    >
                      <Text style={styles.actionText}>✗ Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.processedBadge, {
                    backgroundColor: item.status === 'Approved' ? '#e8f5e9' : '#ffebee'
                  }]}>
                    <Text style={{
                      color: item.status === 'Approved' ? '#2e7d32' : '#c62828',
                      fontWeight: 'bold', fontSize: 12
                    }}>{item.status}</Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No {leaveTab.toLowerCase()} leave requests.</Text>
            }
          />
        )}
      </View>
    );
  };

  const tabs: { key: TabType; icon: string; label: string }[] = [
    { key: 'home',       icon: 'home',       label: 'Home'       },
    { key: 'students',   icon: 'people',     label: 'Students'   },
    { key: 'lecturers',  icon: 'school',     label: 'Lecturers'  },
    { key: 'attendance', icon: 'calendar',   label: 'Attendance' },
    { key: 'leaves',     icon: 'mail',       label: 'Leaves'     },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {activeTab === 'home'       ? '🛡️  Admin Panel'
           : activeTab === 'students'   ? '👥  Students'
           : activeTab === 'lecturers'  ? '🎓  Lecturers'
           : activeTab === 'attendance' ? '📋  Attendance'
           :                             '📨  Leave Requests'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {
          if (activeTab !== 'home') setActiveTab('home');
          else fetchSummary();
        }}>
          <Ionicons name={activeTab !== 'home' ? 'home' : 'refresh'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: '#faf5ff' }}>
        {activeTab === 'home'       && renderHome()}
        {activeTab === 'students'   && renderStudents()}
        {activeTab === 'lecturers'  && renderLecturers()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'leaves'     && renderLeaves()}
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={22}
              color={activeTab === tab.key ? ADMIN_COLOR : '#bbb'}
            />
            <Text style={[styles.navLabel, activeTab === tab.key && { color: ADMIN_COLOR }]}>
              {tab.label}
            </Text>
            {tab.key === 'leaves' && leaves.filter(l => l.status === 'Pending').length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {leaves.filter(l => l.status === 'Pending').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },

  header: {
    backgroundColor: ADMIN_DARK,
    paddingTop: 50, paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  // Home
  welcomeCard: {
    backgroundColor: ADMIN_COLOR,
    margin: 20, borderRadius: 24,
    padding: 22, flexDirection: 'row',
    alignItems: 'center', gap: 16,
    elevation: 6,
  },
  adminBadge:    { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  welcomeSmall:  { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  welcomeName:   { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  rolePill:      { backgroundColor: ADMIN_ACCENT, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6 },
  rolePillText:  { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 20, marginBottom: 12, marginTop: 4 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10, marginBottom: 10 },
  summaryCard:  { width: (width - 50) / 2, borderRadius: 18, padding: 18, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 28, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, fontWeight: '600' },

  quickActions: { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  quickBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 14, borderLeftWidth: 4, elevation: 2, gap: 12 },
  quickBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, padding: 16, borderRadius: 14, backgroundColor: '#fff', gap: 8, elevation: 2 },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 },

  // Lists
  listHeader: { fontSize: 14, fontWeight: '600', color: '#888', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#faf5ff' },
  listCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    gap: 12, elevation: 2,
  },
  listAvatar:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  listAvatarText: { fontSize: 18, fontWeight: 'bold' },
  listName:       { fontSize: 15, fontWeight: '700', color: '#222' },
  listSub:        { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn:      { padding: 8, backgroundColor: '#ffebee', borderRadius: 10 },
  statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  emptyText:      { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 15 },

  // Leave
  tabRow:         { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginTop: 10, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { backgroundColor: ADMIN_COLOR },
  tabBtnText:     { color: '#888', fontWeight: '600' },
  tabBtnTextActive: { color: '#fff', fontWeight: 'bold' },

  leaveCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 10, elevation: 2 },
  leaveActions:  { gap: 6, alignItems: 'flex-end' },
  approveBtn:    { backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  rejectBtn:     { backgroundColor: '#c62828', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  actionText:    { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  processedBadge:{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingBottom: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f0e6ff',
    elevation: 10,
  },
  navItem:      { flex: 1, alignItems: 'center', gap: 3, position: 'relative' },
  navLabel:     { fontSize: 10, color: '#bbb', fontWeight: '600' },
  navBadge:     { position: 'absolute', top: -4, right: 10, backgroundColor: '#d32f2f', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});

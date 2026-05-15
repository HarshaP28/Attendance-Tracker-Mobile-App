import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ✅ CONFIG — single place to change IP
const BASE_URL = "http://192.168.1.2:3000";

interface AttendanceItem {
    name: string;
    roll_no: string;
    attendance_status: 'Present' | 'Absent';
}

export default function ViewAttendance() {
    const router = useRouter();
    const [data, setData] = useState<AttendanceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Summary counts
    const presentCount = data.filter(d => d.attendance_status === 'Present').length;
    const absentCount  = data.filter(d => d.attendance_status === 'Absent').length;

    const fetchAttendance = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/attendance-today`);
            const json = await response.json();
            setData(Array.isArray(json) ? json : []);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchAttendance(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchAttendance(); };

    const renderItem = ({ item }: { item: AttendanceItem }) => {
        const isPresent = item.attendance_status === 'Present';
        return (
            <View style={styles.card}>
                {/* Avatar circle with first letter */}
                <View style={[styles.avatar, { backgroundColor: isPresent ? '#e8f5e9' : '#ffebee' }]}>
                    <Text style={[styles.avatarText, { color: isPresent ? '#2e7d32' : '#c62828' }]}>
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.nameText}>{item.name}</Text>
                    <Text style={styles.rollText}>Roll: {item.roll_no}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: isPresent ? '#e8f5e9' : '#ffebee' }]}>
                    <Ionicons
                        name={isPresent ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={isPresent ? '#2e7d32' : '#c62828'}
                    />
                    <Text style={[styles.statusText, { color: isPresent ? '#2e7d32' : '#c62828' }]}>
                        {item.attendance_status}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Today's Attendance</Text>
                    <Text style={styles.headerDate}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </View>
                <TouchableOpacity onPress={onRefresh}>
                    <Ionicons name="refresh" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Summary Row */}
            {!loading && (
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryBox, { backgroundColor: '#e8f5e9' }]}>
                        <Text style={[styles.summaryCount, { color: '#2e7d32' }]}>{presentCount}</Text>
                        <Text style={[styles.summaryLabel, { color: '#2e7d32' }]}>Present</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: '#ffebee' }]}>
                        <Text style={[styles.summaryCount, { color: '#c62828' }]}>{absentCount}</Text>
                        <Text style={[styles.summaryLabel, { color: '#c62828' }]}>Absent</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: '#e3f2fd' }]}>
                        <Text style={[styles.summaryCount, { color: '#1565c0' }]}>{data.length}</Text>
                        <Text style={[styles.summaryLabel, { color: '#1565c0' }]}>Total</Text>
                    </View>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0b3d91" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Loading attendance...</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.roll_no}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#0b3d91']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="people-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No student records found.</Text>
                            <Text style={{ color: '#999', fontSize: 13 }}>Pull down to refresh</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: '#f5f5f5' },
    header:       { backgroundColor: '#0b3d91', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn:      { padding: 4 },
    headerTitle:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerDate:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
    summaryRow:   { flexDirection: 'row', margin: 15, gap: 10 },
    summaryBox:   { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    summaryCount: { fontSize: 24, fontWeight: 'bold' },
    summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    card: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    avatar:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText:    { fontSize: 18, fontWeight: 'bold' },
    infoContainer: { flex: 1 },
    nameText:      { fontSize: 15, fontWeight: '600', color: '#222' },
    rollText:      { fontSize: 13, color: '#888', marginTop: 2 },
    statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    statusText:    { fontSize: 12, fontWeight: 'bold' },
    center:        { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    emptyText:     { textAlign: 'center', marginTop: 15, color: '#999', fontSize: 16 }
});

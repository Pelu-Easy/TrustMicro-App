import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const loadNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (e) { 
            console.error(e); 
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async () => {
        try {
            await api.patch('/notifications/mark-read');
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadNotifications();
        markAsRead(); // Clear the count on the server when viewing the list
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#003366" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#003366" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item: any) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    renderItem={({ item }) => (
                        // Added conditional styling for unread items
                        <View style={[styles.notifCard, !item.is_read && styles.unreadCard]}>
                            <View style={[styles.iconCircle, { backgroundColor: item.title.includes('Approved') ? '#DCFCE7' : '#E0E7FF' }]}>
                                <Ionicons 
                                    name={item.title.includes('Approved') ? "checkmark-circle" : "cash-outline"} 
                                    size={20} 
                                    color={item.title.includes('Approved') ? "#166534" : "#003366"} 
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.notifTitle}>{item.title}</Text>
                                <Text style={styles.notifBody}>{item.body}</Text>
                                <Text style={styles.notifTime}>
                                    {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            {/* Added Unread Blue Dot indicator */}
                            {!item.is_read && <View style={styles.unreadDot} />}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 100 }}>
                            <Ionicons name="notifications-off-outline" size={50} color="#CBD5E1" />
                            <Text style={{ color: '#94A3B8', marginTop: 10 }}>No notifications yet</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
    notifCard: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        marginHorizontal: 20, 
        marginBottom: 10, 
        padding: 15, 
        borderRadius: 12, 
        gap: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center'
    },
    // New styles for unread states
    unreadCard: { 
        backgroundColor: '#F0F7FF', 
        borderColor: '#BFDBFE' 
    },
    unreadDot: { 
        width: 10, 
        height: 10, 
        borderRadius: 5, 
        backgroundColor: '#3B82F6' 
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    notifTitle: { fontWeight: 'bold', color: '#1E293B', fontSize: 15 },
    notifBody: { color: '#64748B', fontSize: 13, marginTop: 2 },
    notifTime: { fontSize: 10, color: '#94A3B8', marginTop: 5 }
});
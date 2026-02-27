import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
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
            console.error("Failed to load notifications:", e); 
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async () => {
        try {
            // Tells server all notifications for this user are now seen
            await api.patch('/notifications/mark-read');
        } catch (e) { 
            console.error("Failed to mark notifications as read:", e); 
        }
    };

    useEffect(() => {
        loadNotifications();
        markAsRead();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#003366" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#003366" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item: any) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003366" />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            activeOpacity={0.7}
                            style={[styles.notifCard, !item.is_read && styles.unreadCard]}
                        >
                            <View style={[
                                styles.iconCircle, 
                                { backgroundColor: item.title.includes('Approved') || item.title.includes('Disbursed') ? '#DCFCE7' : '#E0E7FF' }
                            ]}>
                                <Ionicons 
                                    name={item.title.includes('Approved') ? "checkmark-circle" : "notifications-outline"} 
                                    size={20} 
                                    color={item.title.includes('Approved') ? "#166534" : "#003366"} 
                                />
                            </View>
                            
                            <View style={styles.textContainer}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                                    {!item.is_read && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={styles.notifBody}>{item.body}</Text>
                                <Text style={styles.notifTime}>
                                    {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                            <Text style={styles.emptySubtext}>Your loan updates will appear here.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backButton: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
    listContent: { paddingVertical: 15 },
    notifCard: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        marginHorizontal: 16, 
        marginBottom: 12, 
        padding: 16, 
        borderRadius: 16, 
        gap: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    unreadCard: { 
        backgroundColor: '#F0F7FF', 
        borderColor: '#BFDBFE' 
    },
    textContainer: { flex: 1 },
    titleRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 4 
    },
    unreadDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        backgroundColor: '#3B82F6' 
    },
    iconCircle: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    notifTitle: { fontWeight: 'bold', color: '#1E293B', fontSize: 15, flex: 1, paddingRight: 10 },
    notifBody: { color: '#64748B', fontSize: 13, lineHeight: 18 },
    notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyText: { color: '#475569', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptySubtext: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8 }
});
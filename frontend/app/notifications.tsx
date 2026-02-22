import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const res = await api.get('/notifications');
                setNotifications(res.data);
            } catch (e) { console.error(e); }
        };
        loadNotifications();
    }, []);

    useEffect(() => {
    const markAsRead = async () => {
        try {
            await api.patch('/notifications/mark-read');
        } catch (e) { console.error(e); }
    };
    
    markAsRead(); // Clear the count on the server
}, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#003366" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.notifCard}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="cash-outline" size={20} color="#003366" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.notifTitle}>{item.title}</Text>
                            <Text style={styles.notifBody}>{item.body}</Text>
                            <Text style={styles.notifTime}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
    notifCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 12, gap: 12 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
    notifTitle: { fontWeight: 'bold', color: '#1E293B' },
    notifBody: { color: '#64748B', fontSize: 13, marginTop: 2 },
    notifTime: { fontSize: 10, color: '#94A3B8', marginTop: 5 }
});
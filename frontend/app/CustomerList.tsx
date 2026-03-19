import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
// --- CHANGE THIS LINE ---
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../services/api'; // Import your custom instance, not raw axios

const CustomerList = () => {
  const navigation = useNavigation<any>();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // --- USE THE API INSTANCE HERE ---
      const response = await api.get('/manager/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const filtered = customers.filter((c: any) => 
      c.full_name.toLowerCase().includes(text.toLowerCase()) || 
      c.bvn.includes(text)
    );
    setFilteredCustomers(filtered);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('CustomerDetail', { customer: item })}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.subText}>BVN: {item.bvn}</Text>
        <Text style={styles.date}>Registered: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.rightContent}>
        <View style={[styles.badge, { backgroundColor: item.kyc_status === 'VERIFIED' ? '#E8F5E9' : '#FFF3E0' }]}>
          <Text style={[styles.badgeText, { color: item.kyc_status === 'VERIFIED' ? '#2E7D32' : '#EF6C00' }]}>
            {item.kyc_status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#CCC" style={{ marginTop: 5, alignSelf: 'flex-end' }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or BVN..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No customers found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 15 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  searchInput: { flex: 1, height: 45, marginLeft: 10 },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  subText: { fontSize: 14, color: '#666', marginTop: 4 },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  rightContent: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' }
});

export default CustomerList;
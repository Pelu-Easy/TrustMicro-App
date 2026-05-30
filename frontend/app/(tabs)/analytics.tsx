import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    DimensionValue,
    RefreshControl, SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import api from '../../services/api';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');
const BRAND = { 
  primary: "#003366", 
  accent: "#10B981", 
  warning: "#F59E0B", 
  danger: "#EF4444",
  bg: "#F8FAFC",
  card: "#FFFFFF" 
};

export default function AnalyticsScreen() {
  const { token, branch, isMD, isCCO } = useUserData();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/manager/all-loans');
      setData(response.data || []);
    } catch (error) {
      console.error("Analytics Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  // --- CALCULATED METRICS ---
  const stats = useMemo(() => {
    const totalVolume = data.reduce((sum, item) => sum + Number(item.loanAmount || item.amount || 0), 0);
    const pendingCount = data.filter(l => l.status.includes('PENDING') || l.status === 'Pending').length;
    const approvedVolume = data
      .filter(l => ['Approved', 'Disbursed', 'APPROVED_FINANCE'].includes(l.status))
      .reduce((sum, item) => sum + Number(item.loanAmount || item.amount || 0), 0);
    
    // Bottleneck Analysis: Count per status
    const distribution = data.reduce((acc: any, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    }, {});

    return { totalVolume, pendingCount, approvedVolume, distribution };
  }, [data]);

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={[styles.statValue, { color: BRAND.primary }]}>{value}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={BRAND.primary} /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Branch Insights</Text>
        <Text style={styles.headerSub}>Real-time performance for {branch || 'Head Office'}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} />}
      >
        {/* TOP LEVEL TOTALS */}
        <View style={styles.row}>
          <StatCard 
            title="Total Portfolio" 
            value={`₦${(stats.totalVolume / 1000000).toFixed(1)}M`} 
            icon="wallet-outline" 
            color={BRAND.primary} 
          />
          <StatCard 
            title="Approved" 
            value={`₦${(stats.approvedVolume / 1000000).toFixed(1)}M`} 
            icon="checkmark-circle-outline" 
            color={BRAND.accent} 
          />
        </View>

        {/* BOTTLENECK ANALYSIS */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Pipeline Bottlenecks</Text>
          <Text style={styles.cardSub}>Where applications are currently sitting</Text>
          
          {Object.entries(stats.distribution).map(([status, count]: any) => {
            const percentage = data.length > 0 ? ((count / data.length) * 100).toFixed(0) : "0";
            return (
              <View key={status} style={styles.barRow}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabel}>{status.replace(/_/g, ' ')}</Text>
                  <Text style={styles.barValue}>{count} loans ({percentage}%)</Text>
                </View>
                <View style={styles.barBg}>
                  <View 
                    style={[
                        styles.barFill, 
                        { 
                            width: `${percentage}%` as DimensionValue, 
                            backgroundColor: status.includes('PENDING') ? BRAND.warning : BRAND.accent 
                        }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* EXECUTIVE ADVISORY */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={BRAND.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Manager Insight</Text>
            <Text style={styles.infoText}>
              You have {stats.pendingCount} loans awaiting action. Processing the "Optimal" route tasks in the Work Basket could reduce turnaround time by 15%.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  header: { padding: 20, backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: BRAND.primary },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  scrollBody: { padding: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { 
    backgroundColor: BRAND.card, 
    width: (width / 2) - 22, 
    padding: 16, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800' },
  chartCard: { backgroundColor: BRAND.card, padding: 20, borderRadius: 20, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: BRAND.primary },
  cardSub: { fontSize: 12, color: '#94A3B8', marginBottom: 20 },
  barRow: { marginBottom: 15 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  barValue: { fontSize: 11, color: '#94A3B8' },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  infoBox: { 
    backgroundColor: '#E0F2FE', 
    padding: 20, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  infoTitle: { fontWeight: 'bold', color: BRAND.primary, fontSize: 15 },
  infoText: { color: '#0369A1', fontSize: 13, marginTop: 4, lineHeight: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: BRAND.danger, marginTop: 10 }
});
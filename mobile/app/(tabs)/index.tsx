import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, ActivityIndicator, Animated,
  Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';

const { width } = Dimensions.get('window');
const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;

const SERVICES = [
  { icon: '🏡', label: 'Farms', route: '/farms', color: '#059669', bg: '#ecfdf5' },
  { icon: '📋', label: 'Activities', route: '/activities', color: '#7c3aed', bg: '#f5f3ff' },
  { icon: '🔔', label: 'Reminders', route: '/reminders', color: '#d97706', bg: '#fffbeb' },
  { icon: '📷', label: 'Detect', route: '/(tabs)/detect', color: '#dc2626', bg: '#fef2f2' },
  { icon: '💬', label: 'Chat', route: '/(tabs)/chat', color: '#2563eb', bg: '#eff6ff' },
  { icon: '☀️', label: 'Weather', route: '/(tabs)/weather', color: '#0891b2', bg: '#ecfeff' },
  { icon: '💰', label: 'Market', route: '/(tabs)/market', color: '#059669', bg: '#ecfdf5' },
  { icon: '🌾', label: 'Smart Recs', route: '/smart-recommendations', color: '#ea580c', bg: '#fff7ed' },
  { icon: '🏛️', label: 'Schemes', route: '/schemes', color: '#4f46e5', bg: '#eef2ff' },
  { icon: '👮', label: 'Officers', route: '/officers', color: '#0d9488', bg: '#f0fdfa' },
  { icon: '⭐', label: 'Feedback', route: '/feedback', color: '#ca8a04', bg: '#fefce8' },
  { icon: '👤', label: 'Profile', route: '/(tabs)/profile', color: '#64748b', bg: '#f8fafc' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [weather, setWeather] = useState({ temp: '--', desc: 'Loading...', humidity: '--', wind: '--' });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const sess = await storage.getSession();
      const profile = await storage.getProfile();
      setSession(sess);

      if (sess?.userId) {
        // Get farmer data and merge with profile/session for location
        const [farmerRes, farmsRes, activitiesRes, remindersRes] = await Promise.all([
          apiFetch(`/api/farmers/${sess.userId}/`),
          apiFetch(`/api/farms/?farmer=${sess.userId}`),
          apiFetch(`/api/activities/?farmer_id=${sess.userId}&limit=5`),
          apiFetch(`/api/reminders/?farmer=${sess.userId}&limit=10`),
        ]);

        const farmer = await farmerRes.json();
        const farmsRaw = await farmsRes.json();
        const farmsArr = Array.isArray(farmsRaw) ? farmsRaw : (farmsRaw.results || []);
        const activitiesRaw = await activitiesRes.json();
        const activitiesArr = Array.isArray(activitiesRaw) ? activitiesRaw : (activitiesRaw.results || []);
        const remindersRaw = await remindersRes.json();
        const remindersArr = Array.isArray(remindersRaw) ? remindersRaw : (remindersRaw.results || []);

        // Use farmer profile location (set during account creation)
        const farmerState = farmer.state || profile?.state || sess.state || '';
        const farmerDistrict = farmer.district || profile?.district || sess.district || '';

        setDashData({
          farmer: {
            name: farmer.name || sess.name || 'Farmer',
            state: farmerState,
            district: farmerDistrict,
          },
          farms: { total: farmsArr.length, acres: farmsArr.reduce((s: number, f: any) => s + parseFloat(f.land_size_acres || 0), 0) },
          activities: { count: activitiesArr.length },
          reminders: { pending: remindersArr.filter((r: any) => !r.is_completed).length },
        });

        // Fetch weather using the farmer's registered location
        try {
          const wRes = await apiFetch(`/api/weather/current?district=${farmerDistrict}&state=${farmerState}`);
          if (wRes.ok) {
            const w = await wRes.json();
            setWeather({
              temp: Math.round(w.main?.temp || 28).toString(),
              desc: w.weather?.[0]?.description || 'Partly Cloudy',
              humidity: (w.main?.humidity || 75).toString(),
              wind: Math.round(w.wind?.speed || 12).toString(),
            });
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await storage.clearAll();
    // Using router.replace ensures the stack is overwritten with the root landing page
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  const name = dashData?.farmer?.name || session?.name || 'Farmer';
  const location = dashData?.farmer?.district && dashData?.farmer?.state
    ? `${dashData.farmer.district}, ${dashData.farmer.state}`
    : dashData?.farmer?.state || session?.state || '';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient colors={['#064e3b', '#059669', '#10b981']} style={styles.hero}>
          {/* Top Row: Greeting + Logout */}
          <View style={styles.topRow}>
            <View style={styles.greetingSection}>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.userName}>{name} 🌿</Text>
              {location ? (
                <View style={styles.locationRow}>
                  <Text style={styles.locationPin}>📍</Text>
                  <Text style={styles.locationText}>{location}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <Text style={styles.heroSub}>Your farming dashboard is ready</Text>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/farms' as any)}>
              <Text style={styles.statEmoji}>🏡</Text>
              <Text style={styles.statValue}>{dashData?.farms?.total ?? '—'}</Text>
              <Text style={styles.statLabel}>Farms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/activities' as any)}>
              <Text style={styles.statEmoji}>📋</Text>
              <Text style={styles.statValue}>{dashData?.activities?.count ?? '—'}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/reminders' as any)}>
              <Text style={styles.statEmoji}>🔔</Text>
              <Text style={styles.statValue}>{dashData?.reminders?.pending ?? '—'}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(tabs)/weather' as any)}>
              <Text style={styles.statEmoji}>🌡️</Text>
              <Text style={styles.statValue}>{weather.temp}°</Text>
              <Text style={styles.statLabel}>{weather.desc.length > 8 ? weather.desc.slice(0, 8) + '..' : weather.desc}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Weather Card */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.weatherCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/weather')}
            >
              <LinearGradient colors={['#1e3a5f', '#2563eb']} style={styles.weatherGrad}>
                <View style={styles.weatherRow}>
                  <View>
                    <Text style={styles.weatherLabel}>Current Weather</Text>
                    <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                    <Text style={styles.weatherDesc}>{weather.desc}</Text>
                    {location ? <Text style={styles.weatherLocation}>📍 {location}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.weatherEmoji}>☀️</Text>
                    <View style={styles.weatherMini}>
                      <Text style={styles.weatherMiniText}>💧 {weather.humidity}%</Text>
                      <Text style={styles.weatherMiniText}>💨 {weather.wind} km/h</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.weatherFooter}>
                  <Text style={styles.weatherTap}>Tap for detailed forecast →</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Services Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧭 Quick Services</Text>
            <Text style={styles.sectionSub}>Tap any service to get started</Text>

            <View style={styles.serviceGrid}>
              {SERVICES.map((srv) => (
                <TouchableOpacity
                  key={srv.label}
                  style={[styles.serviceCard, { backgroundColor: srv.bg }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(srv.route as any)}
                >
                  <View style={[styles.serviceIconWrap, { backgroundColor: srv.color + '18' }]}>
                    <Text style={styles.serviceIcon}>{srv.icon}</Text>
                  </View>
                  <Text style={[styles.serviceLabel, { color: srv.color }]}>{srv.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const GRID_PADDING = 40; // 20px padding on each side
const GRID_GAP = 12;
const cardSize = (width - GRID_PADDING - (GRID_GAP * 2)) / 3; // 3 columns

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Hero
  hero: {
    paddingTop: STATUSBAR_H + 10,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl + 4,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  greetingSection: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  userName: {
    fontSize: FontSize.xxl + 2,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: FontSize.xs + 1,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },

  // Logout Button
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
  },
  logoutIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  logoutText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: FontSize.xl, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Section
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // Services Grid
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    justifyContent: 'flex-start',
  },
  serviceCard: {
    width: cardSize,
    borderRadius: 20,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: cardSize + 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm + 2,
  },
  serviceIcon: { fontSize: 24 },
  serviceLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Weather
  weatherCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  weatherGrad: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weatherLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  weatherTemp: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  weatherDesc: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  weatherLocation: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 4,
  },
  weatherEmoji: { fontSize: 44, marginBottom: 8 },
  weatherMini: { gap: 4 },
  weatherMiniText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  weatherFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  weatherTap: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textAlign: 'center',
  },
});

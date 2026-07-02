import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, FlatList, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';
import { INDIAN_STATES } from '../../constants/india-data';

const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;

export default function WeatherScreen() {
  const router = useRouter();
  const [weather, setWeather] = useState<any>(null);
  const [dailyForecast, setDailyForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location state
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [searchText, setSearchText] = useState('');

  const states = useMemo(() => Object.keys(INDIAN_STATES).sort(), []);
  const districts = useMemo(() => {
    if (!selectedState) return [];
    return ((INDIAN_STATES as Record<string, string[]>)[selectedState] || []).sort();
  }, [selectedState]);

  // Load saved location on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await storage.getSession();
        const profile = await storage.getProfile();
        let state = '';
        let district = '';

        if (session?.userId) {
          try {
            const farmerRes = await apiFetch(`/api/farmers/${session.userId}/`);
            if (farmerRes.ok) {
              const farmer = await farmerRes.json();
              state = farmer.state || '';
              district = farmer.district || '';
            }
          } catch {}
        }

        if (!state) state = profile?.state || session?.state || 'Kerala';
        if (!district) district = profile?.district || session?.district || 'Thiruvananthapuram';

        setSelectedState(state);
        setSelectedDistrict(district);
      } catch {
        setSelectedState('Kerala');
        setSelectedDistrict('Thiruvananthapuram');
      }
    })();
  }, []);

  // Fetch weather when location changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchWeather(selectedState, selectedDistrict);
    }
  }, [selectedState, selectedDistrict]);

  const fetchWeather = async (state: string, district: string) => {
    try {
      setLoading(true);
      setError(null);

      // Current weather
      const res = await apiFetch(`/api/weather/current?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
      if (res.ok) {
        const data = await res.json();
        setWeather({
          temp: Math.round(data.main?.temp || 28),
          feelsLike: Math.round(data.main?.feels_like || 28),
          desc: data.weather?.[0]?.description || 'Partly Cloudy',
          main: data.weather?.[0]?.main || 'Clouds',
          humidity: data.main?.humidity || 75,
          wind: Math.round(data.wind?.speed || 12),
          pressure: data.main?.pressure || 1013,
          visibility: Math.round((data.visibility || 10000) / 1000),
          sunrise: data.sys?.sunrise,
          sunset: data.sys?.sunset,
          location: `${district}, ${state}`,
        });
      } else {
        setError('Could not fetch current weather');
      }

      // 7-day daily forecast
      try {
        const fRes = await apiFetch(`/api/weather/daily?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          const list = fData.list || fData.forecast || fData.daily || [];
          setDailyForecast(list.slice(0, 7));
        } else {
          // Fallback to hourly/forecast and group by day
          const hRes = await apiFetch(`/api/weather/forecast?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
          if (hRes.ok) {
            const hData = await hRes.json();
            const list = hData.list || [];
            // Group by day — take one per day
            const byDay: Record<string, any> = {};
            list.forEach((item: any) => {
              const dateKey = new Date(item.dt * 1000).toDateString();
              if (!byDay[dateKey]) byDay[dateKey] = item;
            });
            setDailyForecast(Object.values(byDay).slice(0, 7));
          }
        }
      } catch {}

    } catch (err: any) {
      setError('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeather(selectedState, selectedDistrict);
    setRefreshing(false);
  };

  const getWeatherEmoji = (desc: string) => {
    const d = (desc || '').toLowerCase();
    if (d.includes('clear') || d.includes('sun')) return '☀️';
    if (d.includes('cloud')) return '⛅';
    if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
    if (d.includes('thunder') || d.includes('storm')) return '⛈️';
    if (d.includes('snow')) return '❄️';
    if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
    return '☁️';
  };

  const getDayName = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDateStr = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    const newDistricts = ((INDIAN_STATES as Record<string, string[]>)[state] || []).sort();
    setSelectedDistrict(newDistricts[0] || '');
    setShowStatePicker(false);
    setSearchText('');
  };

  const handleDistrictSelect = (district: string) => {
    setSelectedDistrict(district);
    setShowDistrictPicker(false);
    setSearchText('');
  };

  // Picker Modal
  const renderPicker = (
    visible: boolean,
    onClose: () => void,
    items: string[],
    onSelect: (item: string) => void,
    title: string,
    selectedValue: string,
  ) => {
    const filtered = items.filter(item =>
      item.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => { onClose(); setSearchText(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${title.toLowerCase()}...`}
                placeholderTextColor={Colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    item === selectedValue && styles.pickerItemSelected,
                  ]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerItemText,
                    item === selectedValue && styles.pickerItemTextSelected,
                  ]}>
                    {item}
                  </Text>
                  {item === selectedValue && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: Colors.text, fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>☀️ Weather</Text>
          </View>
          <Text style={styles.subtitle}>Check weather for any location</Text>
        </View>

        {/* Location Picker */}
        <View style={styles.locationPicker}>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowStatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerLabel}>State</Text>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {selectedState || 'Select State'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => {
              if (!selectedState) {
                setShowStatePicker(true);
              } else {
                setShowDistrictPicker(true);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerLabel}>District</Text>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {selectedDistrict || 'Select District'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading weather...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : weather ? (
          <>
            {/* Main Weather Card */}
            <LinearGradient colors={['#1e3a5f', '#2563eb']} style={styles.mainCard}>
              <Text style={styles.mainLocation}>📍 {weather.location}</Text>
              <Text style={styles.mainEmoji}>{getWeatherEmoji(weather.desc)}</Text>
              <Text style={styles.mainTemp}>{weather.temp}°C</Text>
              <Text style={styles.mainDesc}>{weather.desc}</Text>
              <Text style={styles.mainFeels}>Feels like {weather.feelsLike}°C</Text>

              <View style={styles.metricsRow}>
                {[
                  { icon: '💧', label: 'Humidity', value: `${weather.humidity}%` },
                  { icon: '💨', label: 'Wind', value: `${weather.wind} km/h` },
                  { icon: '🔽', label: 'Pressure', value: `${weather.pressure}` },
                  { icon: '👁', label: 'Visibility', value: `${weather.visibility} km` },
                ].map((m, i) => (
                  <View key={i} style={styles.metricItem}>
                    <Text style={styles.metricIcon}>{m.icon}</Text>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* 7-Day Forecast */}
            {dailyForecast.length > 0 && (
              <View style={styles.forecastSection}>
                <Text style={styles.sectionTitle}>📅 7-Day Forecast</Text>
                {dailyForecast.map((f, i) => {
                  const tempHigh = Math.round(f.main?.temp_max || f.temp?.max || f.main?.temp || 28);
                  const tempLow = Math.round(f.main?.temp_min || f.temp?.min || (tempHigh - 4));
                  const desc = f.weather?.[0]?.description || f.weather?.[0]?.main || 'Clouds';
                  const dayName = getDayName(f.dt);
                  const dateStr = getDateStr(f.dt);
                  const isToday = dayName === 'Today';

                  return (
                    <View
                      key={i}
                      style={[styles.dailyCard, isToday && styles.dailyCardToday]}
                    >
                      {/* Day & Date */}
                      <View style={styles.dailyLeft}>
                        <Text style={[styles.dailyDay, isToday && styles.dailyDayToday]}>
                          {dayName}
                        </Text>
                        <Text style={styles.dailyDate}>{dateStr}</Text>
                      </View>

                      {/* Weather icon & desc */}
                      <View style={styles.dailyCenter}>
                        <Text style={styles.dailyEmoji}>{getWeatherEmoji(desc)}</Text>
                        <Text style={styles.dailyDesc} numberOfLines={1}>
                          {desc.charAt(0).toUpperCase() + desc.slice(1)}
                        </Text>
                      </View>

                      {/* Temps */}
                      <View style={styles.dailyRight}>
                        <Text style={styles.dailyHigh}>{tempHigh}°</Text>
                        <Text style={styles.dailyLow}>{tempLow}°</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Farming Tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>🌾 Farming Tips</Text>
              <Text style={styles.tipsText}>
                {weather.humidity > 70
                  ? '💧 High humidity today. Monitor crops for fungal diseases and improve air circulation.'
                  : weather.temp > 35
                  ? '🔥 High temperature alert. Ensure adequate irrigation and consider shade nets for sensitive crops.'
                  : weather.temp < 10
                  ? '❄️ Low temperature warning. Protect frost-sensitive crops with mulching or row covers.'
                  : '✅ Weather conditions are favorable for farming activities. Great day for fieldwork!'}
              </Text>
            </View>
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      {renderPicker(showStatePicker, () => setShowStatePicker(false), states, handleStateSelect, 'State', selectedState)}
      {renderPicker(showDistrictPicker, () => setShowDistrictPicker(false), districts, handleDistrictSelect, 'District', selectedDistrict)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingTop: STATUSBAR_H + 10, paddingHorizontal: Spacing.xl },
  header: { marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  // Location Picker
  locationPicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    paddingRight: 16,
  },
  pickerArrow: {
    position: 'absolute',
    right: 12,
    bottom: 14,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // Loading
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: FontSize.md },

  // Error
  errorCard: {
    backgroundColor: Colors.redBg, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing.lg, alignItems: 'center',
  },
  errorText: { color: Colors.red, fontWeight: '600', fontSize: FontSize.sm, marginBottom: Spacing.md },
  retryBtn: {
    backgroundColor: Colors.red, borderRadius: BorderRadius.full,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  // Main Card
  mainCard: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  mainLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  mainEmoji: { fontSize: 64, marginBottom: Spacing.md },
  mainTemp: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  mainDesc: {
    fontSize: FontSize.xl, color: 'rgba(255,255,255,0.9)', fontWeight: '600',
    textTransform: 'capitalize', marginTop: 4,
  },
  mainFeels: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  metricsRow: { flexDirection: 'row', marginTop: Spacing.xxl, gap: Spacing.sm },
  metricItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  metricIcon: { fontSize: 18, marginBottom: 4 },
  metricValue: { fontSize: FontSize.sm, fontWeight: '800', color: '#fff' },
  metricLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },

  // 7-Day Forecast
  forecastSection: { marginTop: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dailyCardToday: {
    borderColor: Colors.primaryBorder,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
  },
  dailyLeft: { width: 70 },
  dailyDay: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  dailyDayToday: { color: Colors.primary, fontWeight: '800' },
  dailyDate: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },
  dailyCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dailyEmoji: { fontSize: 26 },
  dailyDesc: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  dailyRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  dailyHigh: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  dailyLow: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textMuted },

  // Tips
  tipsCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.xxl,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tipsTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#065f46', marginBottom: Spacing.sm },
  tipsText: { fontSize: FontSize.sm, color: '#064e3b', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.textMuted,
    fontWeight: '700',
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  pickerItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: FontSize.lg,
    color: Colors.primary,
    fontWeight: '800',
  },
});

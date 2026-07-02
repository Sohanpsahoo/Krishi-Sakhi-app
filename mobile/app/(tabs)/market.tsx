import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, FlatList, Platform, StatusBar,
  Dimensions, KeyboardAvoidingView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';
import { INDIAN_STATES } from '../../constants/india-data';
import Svg, { Path, Circle, Rect, Line as SvgLine, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;
const screenWidth = Dimensions.get('window').width;

export default function MarketScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('prices');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States
  const [prices, setPrices] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pickers & Search
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');

  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Transaction Modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('buy');
  const [modalItem, setModalItem] = useState<any>(null);
  const [modalQuantity, setModalQuantity] = useState('1');
  const [modalNotes, setModalNotes] = useState('');
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [selectedChartIdx, setSelectedChartIdx] = useState(-1);

  // Computed data for dropdowns
  const states = useMemo(() => Object.keys(INDIAN_STATES).sort(), []);
  const districts = useMemo(() => {
    if (!selectedState) return [];
    return ((INDIAN_STATES as Record<string, string[]>)[selectedState] || []).sort();
  }, [selectedState]);

  // Init Data
  useEffect(() => {
    (async () => {
      try {
        const session = await storage.getSession();
        const profile = await storage.getProfile();
        setCurrentUser(session);

        let st = profile?.state || session?.state || 'Kerala';
        let dt = profile?.district || session?.district || 'Ernakulam';
        
        setSelectedState(st);
        setSelectedDistrict(dt);
      } catch (e) {
        setSelectedState('Kerala');
        setSelectedDistrict('Ernakulam');
      }
    })();
  }, []);

  // When State changes, fetch available crops
  useEffect(() => {
    if (!selectedState) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/market/crops?state=${encodeURIComponent(selectedState)}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setAvailableCrops(data.data);
          if (!selectedCrop || !data.data.includes(selectedCrop)) {
            setSelectedCrop(data.data[0]); // default
          }
        }
      } catch (err) {
        console.error('Failed to fetch crops:', err);
      }
    })();
  }, [selectedState]);

  // When location or crop changes, fetch prices and history
  useEffect(() => {
    if (!selectedState || !selectedCrop) return;
    fetchPrices();
    fetchPriceHistory();
  }, [selectedState, selectedDistrict, selectedCrop]);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/market/prices?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}&commodity=${encodeURIComponent(selectedCrop)}`
      );
      const data = await res.json();
      if (data.success) {
        setPrices(data.data || []);
      } else {
        setError('Failed to load market prices.');
      }
    } catch (err) {
      console.warn('Market API Error:', err);
      setError('Connection to market server failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const res = await apiFetch(
        `/api/market/price-history?state=${encodeURIComponent(selectedState)}&commodity=${encodeURIComponent(selectedCrop)}&days=7`
      );
      const data = await res.json();
      if (data.success) {
        setPriceHistory(data.data || []);
      }
    } catch (err) {
      console.warn('History fetch error:', err);
    }
  };

  const fetchInsights = async () => {
    if (!selectedCrop || !selectedState) return;
    setInsightsLoading(true);
    try {
      const mainPrice = prices[0] || {};
      const res = await apiFetch('/api/market/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: selectedCrop,
          state: selectedState,
          district: selectedDistrict,
          modal_price: mainPrice.modal_price,
          min_price: mainPrice.min_price,
          max_price: mainPrice.max_price
        })
      });
      const data = await res.json();
      if (data.success) {
        setInsights(data.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate AI insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!currentUser?.userId) {
      Alert.alert('Login Required', 'You must log in to view orders');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/market/transactions?farmer_id=${currentUser.userId}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (err) {
      console.warn('Orders fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'prices') {
      await fetchPrices();
      await fetchPriceHistory();
    } else if (activeTab === 'insights') {
      await fetchInsights();
    } else if (activeTab === 'orders') {
      await fetchTransactions();
    }
    setRefreshing(false);
  };

  const handleTransaction = async () => {
    if (!currentUser?.userId) {
      Alert.alert('Login Required', 'Please log in first.');
      return;
    }
    const qty = parseFloat(modalQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Entry', 'Quantity must be greater than 0');
      return;
    }

    setTransactionLoading(true);
    const pricePerUnit = modalItem?.modal_price || 0;
    try {
      const res = await apiFetch('/api/market/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: currentUser.userId,
          type: modalType,
          commodity: selectedCrop,
          variety: modalItem?.variety || 'Standard',
          market: `${selectedDistrict} Market`,
          state: selectedState,
          district: selectedDistrict,
          quantity: qty,
          unit: 'quintal',
          price_per_unit: pricePerUnit,
          total_price: pricePerUnit * qty,
          notes: modalNotes
        })
      });
      
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `${modalType === 'buy' ? 'Purchase' : 'Sale'} Order placed successfully!`);
        setShowModal(false);
        setActiveTab('orders'); // switch to orders and fetch
        fetchTransactions();
      } else {
        Alert.alert('Error', data.message || 'Transaction failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to place order.');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Render Pickers
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={() => { onClose(); setSearchText(''); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {items.length > 8 && (
                <View style={styles.searchWrap}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search...`}
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                </View>
              )}

              <FlatList
                data={filtered}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, item === selectedValue && styles.pickerItemSelected]}
                    onPress={() => { onSelect(item); onClose(); setSearchText(''); }}
                  >
                    <Text style={[styles.pickerItemText, item === selectedValue && styles.pickerItemTextSelected]}>
                      {item}
                    </Text>
                    {item === selectedValue && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Render Form Modal
  const renderFormModal = () => {
    const price = modalItem?.modal_price || 0;
    const qty = parseFloat(modalQuantity) || 0;
    const total = (price * qty).toLocaleString();

    return (
      <Modal visible={showModal} animationType="fade" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.formModalOverlay}>
            <View style={styles.formModalCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {modalType === 'buy' ? '🛒 Buy' : '💰 Sell'} {selectedCrop}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>

              <View style={styles.formInfoBox}>
                <View><Text style={styles.formInfoLabel}>Price</Text><Text style={styles.formInfoVal}>₹{price.toLocaleString()}/q</Text></View>
                <View><Text style={styles.formInfoLabel}>Market</Text><Text style={styles.formInfoVal}>{selectedDistrict}</Text></View>
              </View>

              <Text style={styles.formLabel}>Quantity (Quintals)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={modalQuantity}
                onChangeText={setModalQuantity}
                placeholder="0"
              />

              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={modalNotes}
                onChangeText={setModalNotes}
                placeholder="Market requirements, grading..."
              />

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total Value</Text>
                <Text style={styles.totalVal}>₹{total}</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, modalType === 'sell' && styles.submitBtnSell]}
                onPress={handleTransaction}
                disabled={transactionLoading}
              >
                {transactionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Confirm Order</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={styles.root}>
      {/* Pickers */}
      {renderPicker(showStatePicker, () => setShowStatePicker(false), states, setSelectedState, 'Select State', selectedState)}
      {renderPicker(showDistrictPicker, () => setShowDistrictPicker(false), districts, setSelectedDistrict, 'Select District', selectedDistrict)}
      {renderPicker(showCropPicker, () => setShowCropPicker(false), availableCrops, setSelectedCrop, 'Select Crop', selectedCrop)}
      
      {/* Transaction Modal */}
      {renderFormModal()}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: Colors.text, fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>💰 Markets</Text>
          </View>
          <Text style={styles.subtitle}>Prices, Insights & Trading</Text>
        </View>

        {/* Location & Crop Bar */}
        <View style={styles.selectors}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowStatePicker(true)}>
              <Text style={styles.selectLabel}>State</Text>
              <Text style={styles.selectText}>{selectedState || 'All'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectBtn} onPress={() => { if(selectedState) setShowDistrictPicker(true); }}>
              <Text style={styles.selectLabel}>District</Text>
              <Text style={styles.selectText}>{selectedDistrict || 'All'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectBtn, styles.selectBtnPrimary]} onPress={() => setShowCropPicker(true)}>
              <Text style={[styles.selectLabel, { color: 'rgba(255,255,255,0.7)' }]}>Crop</Text>
              <Text style={styles.selectTextWhite}>{selectedCrop || 'Select'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, activeTab === 'prices' && styles.tabActive]} onPress={() => setActiveTab('prices')}>
            <Text style={[styles.tabText, activeTab === 'prices' && styles.tabTextActive]}>📊 Prices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'insights' && styles.tabActive]} onPress={() => { setActiveTab('insights'); if(!insights) fetchInsights(); }}>
            <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>🧠 Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'orders' && styles.tabActive]} onPress={() => { setActiveTab('orders'); fetchTransactions(); }}>
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>📋 Orders</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}><Text style={styles.errorTxt}>{error}</Text></View>
        )}

        {/* -------- PRICES TAB -------- */}
        {activeTab === 'prices' && (
          <View>
            {/* ── Interactive Price Trend Chart (Smooth Bezier + Horizontal Scroll) ── */}
            {priceHistory.length > 0 && (() => {
              const POINT_SPACING = 55;
              const CHART_H = 260;
              const PAD_LEFT = 0;
              const PAD_TOP = 28;
              const PAD_BOTTOM = 44;
              const SVG_W = 30 + priceHistory.length * POINT_SPACING + 20;
              const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

              const allPrices = priceHistory.flatMap(d => [d.min_price, d.max_price, d.modal_price]);
              const yMin = Math.floor(Math.min(...allPrices) * 0.96);
              const yMax = Math.ceil(Math.max(...allPrices) * 1.04);
              const yRange = yMax - yMin || 1;

              const todayIdx = priceHistory.findIndex(d => d.live);
              const realTodayIdx = todayIdx >= 0 ? todayIdx : priceHistory.findIndex(d => d.predicted) - 1;

              const getX = (i: number) => 30 + i * POINT_SPACING;
              const getY = (val: number) => PAD_TOP + plotH - ((val - yMin) / yRange) * plotH;

              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

              // ── Smooth Bezier curve builder (Catmull-Rom to Cubic Bezier) ──
              const buildSmoothPath = (key: string, startIdx: number, endIdx: number) => {
                const points: {x: number; y: number}[] = [];
                for (let i = startIdx; i <= endIdx && i < priceHistory.length; i++) {
                  points.push({ x: getX(i), y: getY(priceHistory[i][key]) });
                }
                if (points.length < 2) return '';
                if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

                let d = `M${points[0].x},${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[Math.max(i - 1, 0)];
                  const p1 = points[i];
                  const p2 = points[i + 1];
                  const p3 = points[Math.min(i + 2, points.length - 1)];
                  const tension = 0.35;
                  const cp1x = p1.x + (p2.x - p0.x) * tension;
                  const cp1y = p1.y + (p2.y - p0.y) * tension;
                  const cp2x = p2.x - (p3.x - p1.x) * tension;
                  const cp2y = p2.y - (p3.y - p1.y) * tension;
                  d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                }
                return d;
              };

              const buildSmoothAreaPath = (key: string, startIdx: number, endIdx: number) => {
                const linePath = buildSmoothPath(key, startIdx, endIdx);
                if (!linePath) return '';
                const lastX = getX(endIdx);
                const firstX = getX(startIdx);
                const bottomY = PAD_TOP + plotH;
                return linePath + ` L${lastX},${bottomY} L${firstX},${bottomY} Z`;
              };

              const pastEnd = Math.min(realTodayIdx >= 0 ? realTodayIdx : priceHistory.length - 1, priceHistory.length - 1);
              const predStart = Math.max(realTodayIdx, 0);
              const predEnd = priceHistory.length - 1;

              const pastModalPath = buildSmoothPath('modal_price', 0, pastEnd);
              const pastMinPath = buildSmoothPath('min_price', 0, pastEnd);
              const pastMaxPath = buildSmoothPath('max_price', 0, pastEnd);
              const pastAreaPath = buildSmoothAreaPath('modal_price', 0, pastEnd);

              const predModalPath = predStart < predEnd ? buildSmoothPath('modal_price', predStart, predEnd) : '';
              const predMinPath = predStart < predEnd ? buildSmoothPath('min_price', predStart, predEnd) : '';
              const predMaxPath = predStart < predEnd ? buildSmoothPath('max_price', predStart, predEnd) : '';
              const predAreaPath = predStart < predEnd ? buildSmoothAreaPath('modal_price', predStart, predEnd) : '';

              // Y-axis ticks
              const yTicks: number[] = [];
              for (let t = 0; t <= 4; t++) yTicks.push(Math.round(yMin + (yRange * t) / 4));

              // Percentage change
              const pastData = priceHistory.filter(d => !d.predicted);
              const pctChange = pastData.length >= 2
                ? ((pastData[pastData.length-1].modal_price - pastData[0].modal_price) / pastData[0].modal_price * 100).toFixed(1)
                : '0.0';

              return (
                <View style={styles.chartCard}>
                  {/* Chart Title + Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1f2937' }}>📉 Price Trend & 🔮 Forecast</Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{selectedCrop} • {selectedState}</Text>
                    </View>
                    <View style={{ backgroundColor: Number(pctChange) >= 0 ? '#d1fae5' : '#fee2e2', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: Number(pctChange) >= 0 ? '#059669' : '#ef4444' }}>
                        {Number(pctChange) >= 0 ? `▲ +${pctChange}%` : `▼ ${pctChange}%`}
                      </Text>
                    </View>
                  </View>

                  {/* Legend */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                    {[
                      { color: '#10B981', label: 'Modal Price' },
                      { color: '#F59E0B', label: 'Min Price' },
                      { color: '#EF4444', label: 'Max Price' },
                      { color: '#8B5CF6', label: '🔮 Predicted' },
                    ].map(legend => (
                      <View key={legend.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 14, height: 3, backgroundColor: legend.color, borderRadius: 2 }} />
                        <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>{legend.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Y-axis labels (fixed) + Scrollable chart */}
                  <View style={{ flexDirection: 'row' }}>
                    {/* Fixed Y-axis */}
                    <View style={{ width: 46, justifyContent: 'flex-start' }}>
                      {yTicks.map((val, i) => (
                        <Text key={`y-${i}`} style={{ position: 'absolute', top: getY(val) - 6, right: 4, fontSize: 9, color: '#9ca3af', fontWeight: '600' }}>
                          ₹{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                        </Text>
                      ))}
                    </View>

                    {/* Horizontally scrollable chart */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}
                      style={{ flex: 1 }}
                      onStartShouldSetResponder={() => false}
                    >
                      <View
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(e) => {
                          const idx = Math.round((e.nativeEvent.locationX - 30) / POINT_SPACING);
                          if (idx >= 0 && idx < priceHistory.length) setSelectedChartIdx(idx);
                        }}
                        onResponderMove={(e) => {
                          const idx = Math.round((e.nativeEvent.locationX - 30) / POINT_SPACING);
                          if (idx >= 0 && idx < priceHistory.length) setSelectedChartIdx(idx);
                        }}
                        onResponderRelease={() => setTimeout(() => setSelectedChartIdx(-1), 3000)}
                      >
                        <Svg width={SVG_W} height={CHART_H}>
                          <Defs>
                            <SvgLinearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0" stopColor="#10B981" stopOpacity="0.3" />
                              <Stop offset="1" stopColor="#10B981" stopOpacity="0.02" />
                            </SvgLinearGradient>
                            <SvgLinearGradient id="pFill" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.18" />
                              <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.02" />
                            </SvgLinearGradient>
                          </Defs>

                          {/* Horizontal grid lines */}
                          {yTicks.map((val, i) => (
                            <SvgLine key={`g${i}`} x1={0} y1={getY(val)} x2={SVG_W} y2={getY(val)} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="5,5" />
                          ))}

                          {/* X-axis date labels */}
                          {priceHistory.map((d, i) => {
                            const dt = new Date(d.date);
                            const label = `${months[dt.getMonth()]} ${dt.getDate()}`;
                            const isToday = i === realTodayIdx;
                            return (
                              <SvgText key={`xl${i}`} x={getX(i)} y={CHART_H - 6} fontSize={isToday ? '11' : '9'} fill={isToday ? '#EF4444' : d.predicted ? '#8B5CF6' : '#9CA3AF'} textAnchor="middle" fontWeight={isToday ? 'bold' : '500'}>
                                {isToday ? `📍${label}` : label}
                              </SvgText>
                            );
                          })}

                          {/* Today divider */}
                          {realTodayIdx >= 0 && (
                            <>
                              <SvgLine x1={getX(realTodayIdx)} y1={PAD_TOP} x2={getX(realTodayIdx)} y2={PAD_TOP + plotH} stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="6,4" />
                              <Rect x={getX(realTodayIdx) - 22} y={PAD_TOP - 18} width={44} height={16} rx={8} fill="#6B7280" />
                              <SvgText x={getX(realTodayIdx)} y={PAD_TOP - 6} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold">Today</SvgText>
                            </>
                          )}

                          {/* Area fills */}
                          {pastAreaPath && <Path d={pastAreaPath} fill="url(#gFill)" />}
                          {predAreaPath && <Path d={predAreaPath} fill="url(#pFill)" />}

                          {/* Past smooth lines */}
                          {pastModalPath && <Path d={pastModalPath} stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
                          {pastMinPath && <Path d={pastMinPath} stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeDasharray="4,3" strokeLinecap="round" />}
                          {pastMaxPath && <Path d={pastMaxPath} stroke="#EF4444" strokeWidth="1.5" fill="none" strokeDasharray="4,3" strokeLinecap="round" />}

                          {/* Predicted smooth lines */}
                          {predModalPath && <Path d={predModalPath} stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeDasharray="8,5" strokeLinecap="round" />}
                          {predMinPath && <Path d={predMinPath} stroke="#C084FC" strokeWidth="1.5" fill="none" strokeDasharray="3,3" strokeLinecap="round" />}
                          {predMaxPath && <Path d={predMaxPath} stroke="#A78BFA" strokeWidth="1.5" fill="none" strokeDasharray="3,3" strokeLinecap="round" />}

                          {/* Data dots */}
                          {priceHistory.map((d, i) => {
                            const cx = getX(i);
                            const isPred = d.predicted;
                            const isLive = d.live;
                            return (
                              <React.Fragment key={`d${i}`}>
                                {/* Modal dot */}
                                <Circle cx={cx} cy={getY(d.modal_price)} r={isLive ? 7 : isPred ? 4.5 : 5} fill={isLive ? '#EF4444' : isPred ? '#8B5CF6' : '#10B981'} stroke="#fff" strokeWidth="2.5" />
                                {/* Min dot */}
                                <Circle cx={cx} cy={getY(d.min_price)} r={2.5} fill={isPred ? '#C084FC' : '#F59E0B'} stroke="#fff" strokeWidth="1" />
                                {/* Max dot */}
                                <Circle cx={cx} cy={getY(d.max_price)} r={2.5} fill={isPred ? '#A78BFA' : '#EF4444'} stroke="#fff" strokeWidth="1" />
                              </React.Fragment>
                            );
                          })}

                          {/* 🔴 LIVE pin */}
                          {realTodayIdx >= 0 && priceHistory[realTodayIdx]?.live && (() => {
                            const px = getX(realTodayIdx);
                            const py = getY(priceHistory[realTodayIdx].modal_price) - 20;
                            return (
                              <>
                                <Circle cx={px} cy={py} r={15} fill="#EF4444" />
                                <Circle cx={px} cy={py} r={15} fill="none" stroke="#EF4444" strokeWidth="3" opacity={0.3} />
                                <SvgText x={px} y={py + 4} fontSize="7" fill="#fff" textAnchor="middle" fontWeight="bold">🔴 LIVE</SvgText>
                              </>
                            );
                          })()}

                          {/* Touch tooltip */}
                          {selectedChartIdx >= 0 && selectedChartIdx < priceHistory.length && (() => {
                            const d = priceHistory[selectedChartIdx];
                            const cx = getX(selectedChartIdx);
                            const tooltipW = 140;
                            const tooltipH = 74;
                            let tx = cx - tooltipW / 2;
                            if (tx < 4) tx = 4;
                            if (tx + tooltipW > SVG_W - 4) tx = SVG_W - tooltipW - 4;
                            const ty = PAD_TOP + 2;
                            const isPred = d.predicted;
                            const dt = new Date(d.date);
                            const dateLabel = `${months[dt.getMonth()]} ${dt.getDate()}`;

                            return (
                              <>
                                <SvgLine x1={cx} y1={PAD_TOP} x2={cx} y2={PAD_TOP + plotH} stroke={isPred ? '#8B5CF6' : '#10B981'} strokeWidth="1.5" strokeDasharray="3,3" opacity={0.5} />
                                <Rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={12} fill="rgba(255,255,255,0.97)" stroke={isPred ? '#8B5CF6' : '#e5e7eb'} strokeWidth="1.5" />
                                <SvgText x={tx + 10} y={ty + 16} fontSize="10" fill={isPred ? '#8B5CF6' : '#374151'} fontWeight="bold">{dateLabel}{isPred ? ' (Predicted)' : d.live ? ' (LIVE)' : ''}</SvgText>
                                <SvgText x={tx + 10} y={ty + 32} fontSize="10" fill="#10B981" fontWeight="600">● Modal: ₹{d.modal_price.toLocaleString()}</SvgText>
                                <SvgText x={tx + 10} y={ty + 47} fontSize="10" fill="#F59E0B" fontWeight="600">● Min: ₹{d.min_price.toLocaleString()}</SvgText>
                                <SvgText x={tx + 10} y={ty + 62} fontSize="10" fill="#EF4444" fontWeight="600">● Max: ₹{d.max_price.toLocaleString()}</SvgText>
                              </>
                            );
                          })()}
                        </Svg>
                      </View>
                    </ScrollView>
                  </View>

                  {/* Bottom indicators */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                    {priceHistory.some(d => d.live) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' }} />
                        <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700' }}>LIVE Data</Text>
                      </View>
                    )}
                    {priceHistory.some(d => d.predicted) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11 }}>🔮</Text>
                        <Text style={{ fontSize: 10, color: '#8b5cf6', fontWeight: '700' }}>7-Day Prediction</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* Price Cards */}
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : prices.length === 0 ? (
              <Text style={styles.emptyTxt}>No active market prices found.</Text>
            ) : (
              prices.map((p, i) => (
                <View key={i} style={styles.priceCard}>
                  <View style={styles.priceHead}>
                    <Text style={styles.priceCrop}>{selectedCrop}</Text>
                    <Text style={styles.priceVariety}>{p.variety || 'FAQ'}</Text>
                  </View>

                  <View style={styles.priceGrid}>
                    <View style={styles.priceBox}>
                      <Text style={styles.pLabel}>Min Price</Text>
                      <Text style={[styles.pVal, { color: '#f59e0b' }]}>₹{p.min_price}</Text>
                    </View>
                    <View style={[styles.priceBox, { backgroundColor: Colors.primaryBg }]}>
                      <Text style={styles.pLabel}>Modal (Avg)</Text>
                      <Text style={[styles.pVal, { color: Colors.primary, fontSize: 22 }]}>₹{p.modal_price}</Text>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.pLabel}>Max Price</Text>
                      <Text style={[styles.pVal, { color: '#ef4444' }]}>₹{p.max_price}</Text>
                    </View>
                  </View>

                  <View style={styles.priceFoot}>
                    <Text style={styles.marketText}>📍 {p.market}</Text>
                    <Text style={styles.dateText}>{new Date(p.arrival_date).toLocaleDateString()}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnBuy} onPress={() => { setModalItem(p); openModal('buy', p); }}>
                      <Text style={styles.btnText}>🛒 Buy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSell} onPress={() => { setModalItem(p); openModal('sell', p); }}>
                      <Text style={styles.btnText}>💰 Sell</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* -------- INSIGHTS TAB -------- */}
        {activeTab === 'insights' && (
          <View>
            {insightsLoading ? (
              <ActivityIndicator size="large" color={Colors.purple} style={{ marginTop: 40 }} />
            ) : insights ? (
              <View style={styles.insightCard}>
                <LinearGradient colors={['#8b5cf6', '#6366f1']} style={styles.insightGrade}>
                  <Text style={styles.insightSummary}>{insights.summary}</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.insightTag}>{insights.trend?.toUpperCase()}</Text>
                    <Text style={styles.insightTag}>{insights.recommendation?.toUpperCase()}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.insightBody}>
                  <Text style={styles.secTitle}>Forecast</Text>
                  <Text style={styles.secText}>{insights.forecast}</Text>

                  <Text style={[styles.secTitle, { marginTop: 16 }]}>Strategy</Text>
                  <Text style={styles.secText}>{insights.bestStrategy}</Text>

                  <Text style={[styles.secTitle, { marginTop: 16 }]}>Actionable Tips</Text>
                  {insights.tips?.map((t: string, i: number) => (
                    <Text key={i} style={styles.tipText}>• {t}</Text>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.generateBtn} onPress={fetchInsights}>
                <Text style={styles.generateTxt}>✨ Generate Market Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* -------- ORDERS TAB -------- */}
        {activeTab === 'orders' && (
          <View>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : transactions.length === 0 ? (
              <Text style={styles.emptyTxt}>No trading history found.</Text>
            ) : (
              transactions.map((tx, i) => (
                <View key={i} style={styles.txCard}>
                  <View style={styles.txHead}>
                    <View style={[styles.txBadge, tx.type === 'buy' ? styles.txBuy : styles.txSell]}>
                      <Text style={[styles.txBadgeTxt, tx.type === 'buy' ? styles.txBuyTxt : styles.txSellTxt]}>
                        {tx.type === 'buy' ? 'BUY' : 'SELL'}
                      </Text>
                    </View>
                    <Text style={styles.txStatus}>{tx.status}</Text>
                  </View>
                  <Text style={styles.txTitle}>{tx.quantity}q {tx.commodity}</Text>
                  <Text style={styles.txDetails}>{tx.market}</Text>
                  <View style={styles.txFoot}>
                    <Text style={styles.txDate}>{new Date(tx.createdAt || Date.now()).toLocaleDateString()}</Text>
                    <Text style={styles.txTotal}>₹{tx.total_price?.toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  function openModal(type: 'buy'|'sell', item: any) {
    if (!currentUser?.userId) {
      Alert.alert('Login Required', 'You must log in to buy or sell.');
      return;
    }
    setModalType(type);
    setModalItem(item);
    setModalQuantity('1');
    setModalNotes('');
    setShowModal(true);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingTop: STATUSBAR_H, paddingHorizontal: Spacing.lg },
  header: { marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  selectors: { marginBottom: Spacing.lg },
  selectBtn: {
    backgroundColor: '#fff', borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: '#e2e8f0', marginRight: Spacing.sm, minWidth: 100
  },
  selectBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  selectLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  selectText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: 4 },
  selectTextWhite: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.xl },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: Colors.text },

  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorTxt: { color: '#ef4444', fontWeight: 'bold' },
  emptyTxt: { textAlign: 'center', marginTop: 40, color: Colors.textMuted, fontSize: FontSize.lg },

  // Prices
  chartCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#f1f5f9' },
  chartTitle: { fontSize: FontSize.md, fontWeight: '800', marginBottom: -10, color: Colors.text, zIndex: 10 },
  
  priceCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  priceHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  priceCrop: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  priceVariety: { fontSize: FontSize.sm, color: Colors.textSecondary, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  
  priceGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  priceBox: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  pLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  pVal: { fontSize: FontSize.md, fontWeight: '800' },

  priceFoot: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  marketText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  dateText: { fontSize: FontSize.xs, color: Colors.textMuted },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  btnBuy: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center' },
  btnSell: { flex: 1, backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  // Insights
  insightCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  insightGrade: { padding: Spacing.xl },
  insightSummary: { color: '#fff', fontSize: FontSize.md, lineHeight: 24, fontWeight: '600', marginBottom: Spacing.md },
  tagRow: { flexDirection: 'row', gap: Spacing.sm },
  insightTag: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 10, fontWeight: '800' },
  insightBody: { padding: Spacing.xl },
  secTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  secText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  tipText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: 4, marginLeft: 8 },
  generateBtn: { backgroundColor: '#8b5cf6', padding: 16, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: 20 },
  generateTxt: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  // Orders
  txCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#e2e8f0' },
  txHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  txBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  txBuy: { backgroundColor: '#d1fae5' }, txSell: { backgroundColor: '#fef3c7' },
  txBadgeTxt: { fontSize: 10, fontWeight: '800' },
  txBuyTxt: { color: '#059669' }, txSellTxt: { color: '#d97706' },
  txStatus: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  txTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  txDetails: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 12 },
  txFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  txDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  txTotal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 22, color: Colors.textMuted, padding: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 12 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: FontSize.md, color: Colors.text },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pickerItemSelected: { backgroundColor: '#f0fdf4' },
  pickerItemText: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  pickerItemTextSelected: { color: Colors.primary, fontWeight: '700' },
  checkmark: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '800' },

  // Form Modal
  formModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  formModalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  formTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  formInfoBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 },
  formInfoLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  formInfoVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: 4 },
  formLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  formInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: FontSize.md, marginBottom: 20 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginBottom: 24 },
  totalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  totalVal: { fontSize: 24, fontWeight: '900', color: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitBtnSell: { backgroundColor: '#f59e0b' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg }
});

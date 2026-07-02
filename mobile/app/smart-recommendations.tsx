import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, 
  Modal, FlatList, Platform, StatusBar, KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { getCropRecommendation, apiFetch } from '../services/api';
import { storage } from '../services/storage';

const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;

const CROP_EMOJI: any = {
  rice: "🌾", wheat: "🌿", maize: "🌽", cotton: "🌸", sugarcane: "🎋",
  banana: "🍌", mango: "🥭", grapes: "🍇", apple: "🍎", coffee: "☕",
  chickpea: "🫘", lentil: "🫘", mungbean: "🫛", pomegranate: "🍎",
  default: "🌱",
};

const CATEGORY_CONFIG: any = {
  crop_planning: { label: "Crop Planning", emoji: "🌱", color: "#f97316", bg: "#fff7ed" },
  soil_health: { label: "Soil Health", emoji: "🪨", color: "#f59e0b", bg: "#fffbeb" },
  irrigation: { label: "Irrigation", emoji: "💧", color: "#3b82f6", bg: "#eff6ff" },
  pest_control: { label: "Pest Control", emoji: "🐛", color: "#f43f5e", bg: "#fff1f2" },
  fertilizer: { label: "Fertilizer", emoji: "🧪", color: "#8b5cf6", bg: "#f5f3ff" },
  best_practices: { label: "Best Practices", emoji: "✨", color: "#10b981", bg: "#ecfdf5" },
};

const IMPACT_STYLES: any = {
  high: { label: "High Impact", color: "#e11d48", dot: "#e11d48", bg: "#fff1f2" },
  medium: { label: "Medium Impact", color: "#d97706", dot: "#f59e0b", bg: "#fffbeb" },
  low: { label: "Low Impact", color: "#16a34a", dot: "#22c55e", bg: "#f0fdf4" },
};

const FILTER_TABS = [
  { key: "all", label: "📋 All" },
  { key: "crop_planning", label: "🌱 Crops" },
  { key: "soil_health", label: "🪨 Soil" },
  { key: "irrigation", label: "💧 Irrigation" },
  { key: "pest_control", label: "🐛 Pest" },
  { key: "fertilizer", label: "🧪 Fert" },
  { key: "best_practices", label: "✨ Best Practices" },
];

export default function SmartRecommendationsScreen() {
  const router = useRouter();
  
  // Data States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  
  // Geo States
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [geoStatus, setGeoStatus] = useState<"loading" | "ready" | "error">("loading");
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId || f._id === selectedFarmId) || null, [farms, selectedFarmId]);

  useEffect(() => {
    (async () => {
      const sess = await storage.getSession();
      const profile = await storage.getProfile();
      
      const userState = profile?.state || sess?.state || '';
      const userDistrict = profile?.district || sess?.district || '';
      
      setCurrentUser({ ...sess, ...profile, state: userState, district: userDistrict });

      if (sess?.userId) {
        fetchFarms(sess.userId);
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentUser?.state || !currentUser?.district) {
      setGeoStatus("error");
      return;
    }
    
    (async () => {
      setGeoStatus("loading");
      try {
        const q = encodeURIComponent(`${currentUser.district || ''}, ${currentUser.state || ''}, India`);
        const headers = { 
          "Accept-Language": "en",
          "User-Agent": "KrishiSakhi-MobileApp/1.0 (contact@krishisakhi.com)"
        };
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers });
        const d = await res.json();
        
        if (d?.length) { 
          setCoords({ lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) }); 
          setGeoStatus("ready"); 
          return; 
        }
        
        // Fallback to State only
        const sq = encodeURIComponent(`${currentUser.state || 'India'}, India`);
        const sr = await fetch(`https://nominatim.openstreetmap.org/search?q=${sq}&format=json&limit=1`, { headers });
        const sd = await sr.json();
        if (sd?.length) { 
          setCoords({ lat: parseFloat(sd[0].lat), lon: parseFloat(sd[0].lon) }); 
          setGeoStatus("ready"); 
        } else {
          setCoords({ lat: 20.5937, lon: 78.9629 }); // Fallback to center of India
          setGeoStatus("ready");
        }
      } catch (e) {
        setCoords({ lat: 20.5937, lon: 78.9629 });
        setGeoStatus("ready");
      }
    })();
  }, [currentUser?.state, currentUser?.district]);

  const fetchFarms = async (userId: string) => {
    try {
      const res = await apiFetch(`/api/farms/?farmer_id=${userId}`);
      const data = await res.json();
      const farmArr = Array.isArray(data) ? data : (data.results || []);
      setFarms(farmArr);
      if (farmArr.length > 0 && !selectedFarmId) {
        setSelectedFarmId(farmArr[0].id || farmArr[0]._id);
      }
    } catch (err) {
      console.warn("Failed to fetch farms", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFarm) {
      Alert.alert("No Farm Selected", "Please select a farm first.");
      return;
    }
    if (!coords) {
      Alert.alert("Location Missing", "Could not track location. Make sure your profile has a valid State/District.");
      return;
    }

    const { nitrogen_value, phosphorus_value, potassium_value, soil_ph } = selectedFarm;
    
    if ([nitrogen_value, phosphorus_value, potassium_value, soil_ph].some(v => v === undefined || v === null || v === '')) {
      Alert.alert("Missing Soil Data", "Your selected farm is missing NPK or pH data. Please edit the farm and add them.");
      return;
    }

    setLoading(true);
    setResult(null);
    setActiveFilter("all");

    try {
      const res = await getCropRecommendation({
        N: parseFloat(nitrogen_value),
        P: parseFloat(phosphorus_value),
        K: parseFloat(potassium_value),
        ph: parseFloat(soil_ph),
        lat: coords.lat,
        lon: coords.lon,
        userState: currentUser.state,
        userDistrict: currentUser.district,
        soilType: selectedFarm.soil_type || "",
        irrigationType: selectedFarm.irrigation_type || "",
        landSizeAcres: selectedFarm.land_size_acres || "",
        farmId: selectedFarm.id || selectedFarm._id,
        farmerId: currentUser.userId
      });
      
      if (res.success || res.recommendation) {
        setResult(res.recommendation || res);
      } else {
        Alert.alert("Error", res.message || "Failed to analyze data");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const visibleCards = useMemo(() => {
    if (!result?.detailedRecommendations) return [];
    if (activeFilter === "all") return result.detailedRecommendations;
    return result.detailedRecommendations.filter((c: any) => c.category === activeFilter);
  }, [result, activeFilter]);

  const getCategoryCount = (key: string) => {
    if (!result?.detailedRecommendations) return 0;
    return key === "all" ? result.detailedRecommendations.length : result.detailedRecommendations.filter((r: any) => r.category === key).length;
  };

  const SOIL_MAP: any = { clay: "Clay", sandy: "Sandy", loamy: "Loamy", black: "Black", red: "Red", alluvial: "Alluvial" };
  const IRR_MAP: any = { rain_fed: "Rain Fed", drip: "Drip", sprinkler: "Sprinkler", flood: "Flood" };
  const emoji = result ? (CROP_EMOJI[result.recommendedCrop?.toLowerCase()] || CROP_EMOJI.default) : "🌱";
  const confPct = result ? Math.round((result.confidence || 0) * 100) : 0;

  return (
    <View style={s.root}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backWrap} onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>🌾 Smart Recommendations</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {!result ? (
          /* ----- FORM VIEW ----- */
          <View style={s.inputSection}>
            <View style={s.pageHead}>
              <View style={s.pageIcon}><Text style={{fontSize: 24}}>🤖</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.pageTitle}>AI Farm Analysis</Text>
                <Text style={s.pageSub}>Automated recommendations based on your soil data</Text>
              </View>
            </View>

            {/* Farm Picker */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>🏠 Select Your Farm</Text>
              {farms.length === 0 ? (
                <View style={s.warnBox}>
                  <Text style={s.warnTxt}>⚠️ No farms found. Please create a farm first.</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowFarmPicker(true)}>
                  <Text style={s.pickerTxt}>{selectedFarm ? selectedFarm.name : '-- Choose a Farm --'}</Text>
                  <Text style={s.pickerArrow}>▼</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Farm Preview Box */}
            {selectedFarm && (
              <View style={s.previewBox}>
                <View style={s.previewHead}>
                  <Text style={s.previewTitle}>{selectedFarm.name}</Text>
                  <View style={s.previewBadge}><Text style={s.previewBadgeTxt}>Data Loaded</Text></View>
                </View>

                <View style={s.npkGrid}>
                  {[
                    { lbl: 'Nitrogen (N)', val: selectedFarm.nitrogen_value, color: '#16a34a' },
                    { lbl: 'Phosphorus (P)', val: selectedFarm.phosphorus_value, color: '#2563eb' },
                    { lbl: 'Potassium (K)', val: selectedFarm.potassium_value, color: '#9333ea' },
                    { lbl: 'Soil pH', val: selectedFarm.soil_ph, color: '#d97706' },
                  ].map((n, i) => (
                    <View key={i} style={s.npkCell}>
                      <Text style={s.npkLbl}>{n.lbl}</Text>
                      <Text style={[s.npkVal, { color: n.color }]}>{n.val !== undefined && n.val !== null && n.val !== "" ? n.val : '—'}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.infoRow}>
                  <Text style={s.infoDets}>🧱 {SOIL_MAP[selectedFarm.soil_type] || selectedFarm.soil_type || "No Soil Set"}</Text>
                  <Text style={s.infoDets}>💧 {IRR_MAP[selectedFarm.irrigation_type] || selectedFarm.irrigation_type || "No Irr. Set"}</Text>
                </View>
              </View>
            )}

            {/* Geo Info */}
            <View style={s.geoBox}>
              <Text style={s.geoHead}>📍 Location Status</Text>
              <Text style={s.geoLoc}>{currentUser?.district || 'Unknown'}, {currentUser?.state || 'Unknown'}</Text>
              <Text style={s.geoCoords}>
                {geoStatus === 'loading' ? 'Resolving coordinates...' : geoStatus === 'error' ? 'Failed to resolve' : `${coords?.lat.toFixed(4)}°N, ${coords?.lon.toFixed(4)}°E`}
              </Text>
            </View>

            <TouchableOpacity 
              style={[s.submitBtn, (loading || !selectedFarm || geoStatus !== "ready") && {opacity: 0.6}]} 
              onPress={handleSubmit} 
              disabled={loading || !selectedFarm || geoStatus !== "ready"}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>✨ Generate Recommendation</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* ----- RESULT VIEW ----- */
          <View style={s.resultSection}>
            <LinearGradient colors={['#059669', '#10b981', '#14b8a6']} style={s.resHero}>
              <Text style={s.resSubLabel}>RECOMMENDED CROP</Text>
              <View style={s.resTitleRow}>
                <Text style={s.resEmoji}>{emoji}</Text>
                <Text style={s.resCropName}>{result.recommendedCrop}</Text>
              </View>
              
              <View style={s.resBadgeLine}>
                <View style={s.confBadge}>
                  <Text style={s.confTxt}>{confPct}% Confidence</Text>
                </View>
                {result.mlAgreed === false && (
                  <View style={s.warnBadge}><Text style={s.warnBadgeTxt}>⚠️ Region Adjusted</Text></View>
                )}
              </View>

              <Text style={s.resExpl} numberOfLines={3}>{result.explanation}</Text>
            </LinearGradient>

            <View style={s.quickInfoGrid}>
              <View style={s.quickInfoCard}>
                <Text style={s.quickIcon}>📅</Text>
                <Text style={s.quickLbl}>Sowing Time</Text>
                <Text style={s.quickVal} numberOfLines={2}>{result.bestSowingTime}</Text>
              </View>
              <View style={s.quickInfoCard}>
                <Text style={s.quickIcon}>📈</Text>
                <Text style={s.quickLbl}>Expected Yield</Text>
                <Text style={s.quickVal} numberOfLines={2}>{result.estimatedYield}</Text>
              </View>
            </View>

            {result.alternativeCrops?.length > 0 && (
              <View style={s.altBox}>
                <Text style={s.altBoxLbl}>🔄 Alternatives:</Text>
                <View style={s.altChips}>
                  {result.alternativeCrops.map((a: any, i: number) => {
                    const cName = a.crop || a;
                    const e = CROP_EMOJI[cName.toLowerCase()] || '🌱';
                    return (
                      <View key={i} style={s.altChip}>
                        <Text style={s.altChipTxt}>{e} {cName} {a.confidence ? `(${Math.round(a.confidence*100)}%)` : ''}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* DETAILED CARDS */}
            {result.detailedRecommendations?.length > 0 && (
              <View style={s.detailsSection}>
                <Text style={s.detailsTitle}>📋 Detailed Care Plan</Text>
                
                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={{paddingRight: 20}}>
                  {FILTER_TABS.map(t => {
                    const c = getCategoryCount(t.key);
                    if (c === 0 && t.key !== 'all') return null;
                    const isAct = activeFilter === t.key;
                    return (
                      <TouchableOpacity key={t.key} onPress={() => setActiveFilter(t.key)} style={[s.filterBtn, isAct && s.filterBtnAct]}>
                        <Text style={[s.filterTxt, isAct && s.filterTxtAct]}>{t.label}</Text>
                        <View style={[s.filterPill, isAct && s.filterPillAct]}><Text style={[s.filterPillTxt, isAct && s.filterPillTxtAct]}>{c}</Text></View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Cards */}
                <View style={s.cardsGrid}>
                  {visibleCards.map((rec: any, idx: number) => {
                    const cfg = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.best_practices;
                    const imp = IMPACT_STYLES[rec.impact] || IMPACT_STYLES.medium;
                    
                    return (
                      <View key={idx} style={[s.recCard, { borderLeftColor: cfg.color }]}>
                        <View style={s.recHeader}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <View style={[s.recCatPill, {backgroundColor: cfg.bg}]}>
                              <Text style={[s.recCatIcon, {color: cfg.color}]}>{cfg.emoji}</Text>
                              <Text style={[s.recCatTxt, {color: cfg.color}]}>{cfg.label}</Text>
                            </View>
                          </View>
                          <View style={[s.impPill, {backgroundColor: imp.bg}]}>
                            <View style={[s.impDot, {backgroundColor: imp.dot}]} />
                            <Text style={[s.impTxt, {color: imp.color}]}>{imp.label}</Text>
                          </View>
                        </View>
                        <Text style={s.recTitle}>{rec.title}</Text>
                        <Text style={s.recDesc}>{rec.description}</Text>
                        {rec.tags?.length > 0 && (
                          <View style={s.tagsRow}>
                            {rec.tags.map((tg: string, k: number) => (
                              <View key={k} style={s.tagBubble}><Text style={s.tagBubbleTxt}>#{tg}</Text></View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity style={s.refreshBtn} onPress={() => { setResult(null); setActiveFilter("all"); }}>
              <Text style={s.refreshBtnTxt}>🔄 Start New Analysis</Text>
            </TouchableOpacity>

          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FARM PICKER MODAL */}
      <Modal visible={showFarmPicker} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Select Farm</Text>
              <TouchableOpacity onPress={() => setShowFarmPicker(false)}><Text style={{fontSize: 24}}>✕</Text></TouchableOpacity>
            </View>
            <FlatList
              data={farms}
              keyExtractor={f => f.id || f._id}
              renderItem={({item}) => (
                <TouchableOpacity style={[s.farmPickBtn, selectedFarmId === (item.id || item._id) && s.farmPickBtnAct]} onPress={() => { setSelectedFarmId(item.id || item._id); setShowFarmPicker(false); }}>
                  <Text style={[s.farmPickTxt, selectedFarmId === (item.id || item._id) && s.farmPickTxtAct]}>🏠 {item.name}</Text>
                  <Text style={s.farmPickSub}>{item.land_size_acres} acres</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: STATUSBAR_H, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  backWrap: { paddingRight: 16 },
  backIcon: { fontSize: 24, color: '#0f766e', fontWeight: '800' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  scroll: { padding: Spacing.lg },

  // INPUT
  inputSection: { gap: 16 },
  pageHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  pageIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 18 },

  fieldWrap: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  warnBox: { backgroundColor: '#fffbeb', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fef3c7' },
  warnTxt: { color: '#d97706', fontSize: 12, fontWeight: '600' },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  pickerTxt: { fontSize: 14, fontWeight: '800', color: Colors.text },
  pickerArrow: { color: '#94a3b8' },

  previewBox: { backgroundColor: '#ecfdf5', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#d1fae5' },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  previewTitle: { fontSize: 16, fontWeight: '800', color: '#065f46' },
  previewBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  previewBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '800' },
  npkGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  npkCell: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d1fae5', alignItems: 'center' },
  npkLbl: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  npkVal: { fontSize: 20, fontWeight: '900' },
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  infoDets: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 10, fontWeight: '700', color: '#059669', borderWidth: 1, borderColor: '#d1fae5' },

  geoBox: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  geoHead: { fontSize: 14, fontWeight: '800', color: '#1e40af', marginBottom: 4 },
  geoLoc: { fontSize: 14, fontWeight: '800', color: '#1d4ed8' },
  geoCoords: { fontSize: 10, color: '#3b82f6', marginTop: 4, fontWeight: '600' },

  submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 8, shadowColor: '#10b981', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // RESULT
  resultSection: { gap: 16 },
  resHero: { padding: 24, borderRadius: 28, shadowColor: '#059669', shadowOffset: {width:0, height:6}, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  resSubLabel: { fontSize: 10, color: '#d1fae5', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  resTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resEmoji: { fontSize: 44, marginRight: 16 },
  resCropName: { fontSize: 32, fontWeight: '900', color: '#fff', textTransform: 'capitalize' },
  resBadgeLine: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  confBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  confTxt: { fontSize: 12, color: '#fff', fontWeight: '800' },
  warnBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  warnBadgeTxt: { fontSize: 10, color: '#d97706', fontWeight: '800' },
  resExpl: { fontSize: 13, color: '#ecfdf5', lineHeight: 20, fontWeight: '500' },

  quickInfoGrid: { flexDirection: 'row', gap: 12 },
  quickInfoCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  quickIcon: { fontSize: 20, marginBottom: 8 },
  quickLbl: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  quickVal: { fontSize: 14, fontWeight: '800', color: Colors.text },

  altBox: { backgroundColor: '#faf5ff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff' },
  altBoxLbl: { fontSize: 12, fontWeight: '800', color: '#7e22ce', marginBottom: 8 },
  altChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  altChip: { backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e9d5ff' },
  altChipTxt: { fontSize: 12, fontWeight: '800', color: '#6b21a8', textTransform: 'capitalize' },

  detailsSection: { marginTop: 12 },
  detailsTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  filtersScroll: { marginBottom: 16, paddingBottom: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  filterBtnAct: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterTxt: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  filterTxtAct: { color: '#fff' },
  filterPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  filterPillAct: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterPillTxt: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  filterPillTxtAct: { color: '#fff' },

  cardsGrid: { gap: 12 },
  recCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recCatPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  recCatIcon: { fontSize: 12 },
  recCatTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  impPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  impDot: { width: 6, height: 6, borderRadius: 3 },
  impTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  recTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  recDesc: { fontSize: 13, color: '#475569', lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tagBubble: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagBubbleTxt: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  refreshBtn: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 12 },
  refreshBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Farm Picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 20, maxHeight: '70%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  farmPickBtn: { padding: 16, borderRadius: 16, backgroundColor: '#f8fafc', marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  farmPickBtnAct: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  farmPickTxt: { fontSize: 16, fontWeight: '800', color: Colors.text },
  farmPickTxtAct: { color: '#065f46' },
  farmPickSub: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' }
});

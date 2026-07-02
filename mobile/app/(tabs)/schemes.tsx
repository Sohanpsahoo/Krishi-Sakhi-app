import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, FlatList, Platform, StatusBar, Linking,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';
import { INDIAN_STATES } from '../../constants/india-data';

const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;

const CATEGORY_CONFIG: any = {
  national: { icon: '🇮🇳', label: 'National', color: '#FF9933', bg: '#fff7ed' },
  state: { icon: '🏛️', label: 'State', color: '#138808', bg: '#f0fdf4' },
};

const TAG_COLORS = [
  { bg: '#fff7ed', text: '#ea580c' },
  { bg: '#f0fdf4', text: '#16a34a' },
  { bg: '#eff6ff', text: '#2563eb' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#fdf2f8', text: '#db2777' },
  { bg: '#f3e8ff', text: '#9333ea' }
];

export default function SchemesScreen() {
  const router = useRouter();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);

  const [showStatePicker, setShowStatePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const states = useMemo(() => Object.keys(INDIAN_STATES).sort(), []);

  useEffect(() => {
    (async () => {
      try {
        const session = await storage.getSession();
        const profile = await storage.getProfile();
        let st = profile?.state || session?.state || 'Kerala';
        setSelectedState(st);
      } catch (e) {
        setSelectedState('Kerala');
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedState) fetchSchemes();
  }, [selectedState, activeFilter]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const params = [];
      if (selectedState) params.push(`state=${encodeURIComponent(selectedState)}`);
      if (activeFilter !== 'all') params.push(`category=${activeFilter}`);
      
      const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await apiFetch(`/api/schemes/${queryStr}`);
      const data = await res.json();
      if (data.success) {
        setSchemes(data.data || []);
      } else {
        setSchemes([]);
      }
    } catch (err) {
      console.warn('Failed to fetch schemes:', err);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchSchemes();
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/schemes/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setSchemes(data.data || []);
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (searchQuery.trim()) {
      await handleSearch();
    } else {
      await fetchSchemes();
    }
  };

  const nationalCount = schemes.filter(s => s.category === 'national').length;

  const renderStatePicker = () => {
    const filtered = states.filter(s => s.toLowerCase().includes(pickerSearch.toLowerCase()));
    return (
      <Modal visible={showStatePicker} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State</Text>
                <TouchableOpacity onPress={() => { setShowStatePicker(false); setPickerSearch(''); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchWrapModal}>
                <Text style={styles.searchIconModal}>🔍</Text>
                <TextInput
                  style={styles.searchInputModal}
                  placeholder="Find your state..."
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, item === selectedState && styles.pickerItemSel]}
                    onPress={() => { setSelectedState(item); setShowStatePicker(false); setPickerSearch(''); }}
                  >
                    <Text style={[styles.pickerText, item === selectedState && styles.pickerTextSel]}>{item}</Text>
                    {item === selectedState && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={styles.root}>
      {renderStatePicker()}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#FF9933" />}
        showsVerticalScrollIndicator={false}
      >
        {/* TRICOLOR HEADER */}
        <View style={styles.heroCard}>
          <LinearGradient colors={['#FF9933', '#f97316']} style={styles.heroTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 24, color: '#fff', fontWeight: '800' }}>←</Text>
              </TouchableOpacity>
              <Text style={styles.heroTitle}>🏛️ Govt Schemes</Text>
            </View>
            <Text style={styles.heroSub}>National & State Welfare</Text>
            {selectedState ? <View style={styles.heroBadge}><Text style={styles.heroBadgeTxt}>📍 {selectedState}</Text></View> : null}
          </LinearGradient>
          
          <View style={styles.heroMid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#f97316' }]}>{schemes.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#000080' }]}>🇮🇳 {nationalCount}</Text>
              <Text style={styles.statLabel}>National</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#16a34a' }]}>🏛️</Text>
              <Text style={styles.statLabel}>State</Text>
            </View>
          </View>

          <LinearGradient colors={['#138808', '#16a34a']} style={styles.heroBottom} />
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.stateBtn} onPress={() => setShowStatePicker(true)}>
            <Text style={styles.stateBtnLabel}>State</Text>
            <Text style={styles.stateBtnVal}>{selectedState || 'Select'}</Text>
          </TouchableOpacity>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search schemes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTERS */}
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'all', label: '📋 All', color: '#FF9933' },
              { id: 'national', label: '🇮🇳 National', color: '#000080' },
              { id: 'state', label: '🏛️ State', color: '#138808' },
            ].map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, activeFilter === f.id ? { backgroundColor: f.color, borderColor: f.color } : null]}
                onPress={() => setActiveFilter(f.id)}
              >
                <Text style={[styles.filterTxt, activeFilter === f.id && { color: '#fff', fontWeight: '800' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#FF9933" style={{ marginTop: 40 }} />
        ) : !selectedState ? (
          <Text style={styles.emptyMsg}>Select a State to view available schemes.</Text>
        ) : schemes.length === 0 ? (
          <Text style={styles.emptyMsg}>No schemes found. Try a different search term.</Text>
        ) : (
          <View style={styles.list}>
            {schemes.map((s, i) => {
              const cat = CATEGORY_CONFIG[s.category] || CATEGORY_CONFIG.national;
              const isExpanded = expandedScheme === (s._id || s.id);
              
              return (
                <View key={s._id || s.id || i} style={styles.card}>
                  <View style={styles.cardStripe}>
                    <View style={styles.stripeOrange} />
                    <View style={styles.stripeWhite} />
                    <View style={styles.stripeGreen} />
                  </View>
                  
                  <TouchableOpacity style={styles.cardBody} activeOpacity={0.8} onPress={() => setExpandedScheme(isExpanded ? null : (s._id || s.id))}>
                    <View style={styles.cardHead}>
                      <View style={[styles.cardIconBox, { backgroundColor: cat.color }]}>
                        <Text style={styles.cardIcon}>{cat.icon}</Text>
                      </View>
                      <View style={styles.cardHeadContent}>
                        <Text style={styles.cardTitle}>{s.name}</Text>
                        <View style={styles.cardBadges}>
                          <View style={[styles.badge, { backgroundColor: cat.bg, borderColor: cat.color }]}>
                            <Text style={[styles.badgeTxt, { color: cat.color }]}>{cat.label}</Text>
                          </View>
                          {s.launch_year && (
                            <View style={[styles.badge, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                              <Text style={[styles.badgeTxt, { color: '#64748b' }]}>📅 {s.launch_year}</Text>
                            </View>
                          )}
                          {s.status === 'active' && (
                            <View style={[styles.badge, { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]}>
                              <Text style={[styles.badgeTxt, { color: '#16a34a' }]}>✅ Active</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <Text style={styles.cardDesc} numberOfLines={isExpanded ? undefined : 3}>{s.description}</Text>

                    {s.department && (
                      <Text style={styles.cardDept}>🏢 {s.department}</Text>
                    )}

                    {!isExpanded && (
                      <Text style={styles.expandHint}>▼ Tap to show details</Text>
                    )}

                    {isExpanded && (
                      <View style={styles.expandedBox}>
                        
                        {s.highlights?.length > 0 && (
                          <View style={styles.section}>
                            <Text style={styles.sectionTitle}>✨ Key Highlights</Text>
                            {s.highlights.map((h: string, j: number) => (
                              <View key={j} style={styles.bulletRow}>
                                <Text style={[styles.bulletPoint, { color: j % 2 === 0 ? '#ea580c' : '#16a34a' }]}>▸</Text>
                                <Text style={styles.bulletText}>{h}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {s.eligibility && (
                          <View style={[styles.section, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                            <Text style={[styles.sectionTitle, { color: '#1e40af' }]}>👥 Eligibility</Text>
                            <Text style={styles.sectionText}>{s.eligibility}</Text>
                          </View>
                        )}
                        
                        {s.benefits && (
                          <View style={[styles.section, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                            <Text style={[styles.sectionTitle, { color: '#166534' }]}>💰 Benefits</Text>
                            <Text style={styles.sectionText}>{s.benefits}</Text>
                          </View>
                        )}

                        {s.official_url && (
                          <TouchableOpacity style={styles.urlBtn} onPress={() => Linking.openURL(s.official_url)}>
                            <Text style={styles.urlBtnTxt}>🔗 View Official Website</Text>
                          </TouchableOpacity>
                        )}

                        {s.tags?.length > 0 && (
                          <View style={styles.tagWrap}>
                            {s.tags.map((t: string, j: number) => {
                              const tg = TAG_COLORS[j % TAG_COLORS.length];
                              return (
                                <View key={j} style={[styles.tag, { backgroundColor: tg.bg }]}>
                                  <Text style={[styles.tagTxt, { color: tg.text }]}>#{t}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingTop: STATUSBAR_H, paddingHorizontal: 16 },

  // Hero
  heroCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.1, shadowRadius:8, backgroundColor: '#fff' },
  heroTop: { padding: 24, paddingBottom: 20 },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginTop: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
  heroBadgeTxt: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  heroMid: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16 },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  statNum: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  heroBottom: { height: 6 },

  // Search
  searchContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  stateBtn: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  stateBtnLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  stateBtnVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: FontSize.md, color: Colors.text },
  searchBtn: { width: 52, height: 52, backgroundColor: '#FF9933', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Filters
  filters: { marginBottom: 20 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
  filterTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  // Empty
  emptyMsg: { textAlign: 'center', marginTop: 40, fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '500' },

  // List
  list: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  cardStripe: { flexDirection: 'row', height: 4 },
  stripeOrange: { flex: 1, backgroundColor: '#FF9933' },
  stripeWhite: { flex: 1, backgroundColor: '#fff' },
  stripeGreen: { flex: 1, backgroundColor: '#138808' },
  cardBody: { padding: 20 },
  cardHead: { flexDirection: 'row', marginBottom: 12 },
  cardIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 24 },
  cardHeadContent: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  
  cardDesc: { fontSize: FontSize.sm, color: '#475569', lineHeight: 22, marginBottom: 12 },
  cardDept: { fontSize: FontSize.xs, color: '#94a3b8', fontWeight: '600', marginBottom: 16 },
  expandHint: { fontSize: FontSize.sm, color: '#FF9933', fontWeight: '800' },

  expandedBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  section: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sectionText: { fontSize: FontSize.sm, color: '#334155', lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletPoint: { fontSize: 16, fontWeight: '800', marginRight: 8, marginTop: -2 },
  bulletText: { flex: 1, fontSize: FontSize.sm, color: '#475569', lineHeight: 22 },
  
  urlBtn: { backgroundColor: '#138808', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  urlBtnTxt: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagTxt: { fontSize: 10, fontWeight: '800' },

  // Picker
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 24, color: Colors.textMuted },
  searchWrapModal: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center' },
  searchIconModal: { fontSize: 16, marginRight: 8 },
  searchInputModal: { flex: 1, paddingVertical: 14, fontSize: FontSize.md, color: Colors.text },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pickerItemSel: { backgroundColor: '#fff7ed' },
  pickerText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  pickerTextSel: { color: '#ea580c', fontWeight: '800' },
  checkmark: { color: '#ea580c', fontSize: 20, fontWeight: '800' }
});

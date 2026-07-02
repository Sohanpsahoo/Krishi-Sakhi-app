import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Modal,
  Alert, Platform, KeyboardAvoidingView, Dimensions, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';

const { width } = Dimensions.get('window');

const SOIL_TYPES = [
  { value: 'clay', label: 'Clay', icon: '🧱' },
  { value: 'sandy', label: 'Sandy', icon: '🏜️' },
  { value: 'loamy', label: 'Loamy', icon: '🌿' },
  { value: 'black', label: 'Black Soil', icon: '⬛' },
  { value: 'red', label: 'Red Soil', icon: '🔴' },
  { value: 'alluvial', label: 'Alluvial', icon: '🏞️' },
  { value: 'laterite', label: 'Laterite', icon: '🟤' },
];

const IRRIGATION_TYPES = [
  { value: 'rain_fed', label: 'Rain Fed', icon: '🌧' },
  { value: 'drip', label: 'Drip Irrigation', icon: '💧' },
  { value: 'sprinkler', label: 'Sprinkler', icon: '🚿' },
  { value: 'flood', label: 'Flood Irrigation', icon: '🌊' },
  { value: 'canal', label: 'Canal', icon: '🌊' },
  { value: 'bore_well', label: 'Bore Well', icon: '🕳' },
  { value: 'open_well', label: 'Open Well', icon: '⛲' },
];

const CARD_GRADIENTS: [string, string][] = [
  ['#059669', '#0d9488'],
  ['#f59e0b', '#ea580c'],
  ['#3b82f6', '#7c3aed'],
  ['#ec4899', '#ef4444'],
  ['#06b6d4', '#059669'],
  ['#8b5cf6', '#6366f1'],
];

const CARD_EMOJIS = ['🌾', '🌻', '🌿', '🍃', '🌱', '☘️'];

// Dropdown Picker component
function OptionPicker({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; icon: string }[];
  onSelect: (val: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View>
      <Text style={formStyles.label}>{label}</Text>
      <TouchableOpacity
        style={formStyles.picker}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[formStyles.pickerText, !value && formStyles.pickerPlaceholder]}>
          {selected ? `${selected.icon} ${selected.label}` : placeholder}
        </Text>
        <Text style={formStyles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={formStyles.modalOverlay}>
          <View style={formStyles.modalCard}>
            <View style={formStyles.modalHeader}>
              <Text style={formStyles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={formStyles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[formStyles.optionRow, item.value === value && formStyles.optionRowActive]}
                  onPress={() => { onSelect(item.value); setVisible(false); }}
                >
                  <Text style={formStyles.optionText}>
                    {item.icon} {item.label}
                  </Text>
                  {item.value === value && <Text style={formStyles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const DEFAULT_FORM = {
  name: '',
  land_size_acres: '',
  soil_type: 'loamy',
  irrigation_type: 'rain_fed',
  nitrogen_value: '',
  phosphorus_value: '',
  potassium_value: '',
  soil_ph: '',
};

export default function FarmsScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<any>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);

  const fetchFarms = async () => {
    try {
      const sess = await storage.getSession();
      setSession(sess);
      if (!sess?.userId) return;
      const res = await apiFetch(`/api/farms/?farmer=${sess.userId}`);
      const data = await res.json();
      setFarms(Array.isArray(data) ? data : (data.results || []));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchFarms(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFarms();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM });
    setEditingFarm(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (farm: any) => {
    setFormData({
      name: farm.name || '',
      land_size_acres: (farm.land_size_acres || '').toString(),
      soil_type: farm.soil_type || 'loamy',
      irrigation_type: farm.irrigation_type || 'rain_fed',
      nitrogen_value: farm.nitrogen_value != null ? farm.nitrogen_value.toString() : '',
      phosphorus_value: farm.phosphorus_value != null ? farm.phosphorus_value.toString() : '',
      potassium_value: farm.potassium_value != null ? farm.potassium_value.toString() : '',
      soil_ph: farm.soil_ph != null ? farm.soil_ph.toString() : '',
    });
    setEditingFarm(farm);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Farm name is required');
      return;
    }
    if (!formData.land_size_acres) {
      Alert.alert('Error', 'Land size is required');
      return;
    }
    if (!formData.nitrogen_value || !formData.phosphorus_value || !formData.potassium_value || !formData.soil_ph) {
      Alert.alert('Error', 'Soil Nutrients (N, P, K) and pH are required for smart recommendations');
      return;
    }

    setSaving(true);
    try {
      const method = editingFarm ? 'PUT' : 'POST';
      const url = editingFarm ? `/api/farms/${editingFarm.id || editingFarm._id}/` : '/api/farms/';
      const payload: any = {
        farmer: session?.userId,
        name: formData.name.trim(),
        land_size_acres: parseFloat(formData.land_size_acres) || 0,
        soil_type: formData.soil_type,
        irrigation_type: formData.irrigation_type,
        nitrogen_value: parseFloat(formData.nitrogen_value),
        phosphorus_value: parseFloat(formData.phosphorus_value),
        potassium_value: parseFloat(formData.potassium_value),
        soil_ph: parseFloat(formData.soil_ph),
      };

      // Add farmer location
      if (session?.state) payload.state = session.state;
      if (session?.district) payload.district = session.district;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 201) {
        Alert.alert(
          editingFarm ? '✅ Farm Updated' : '🎉 Farm Added',
          editingFarm ? 'Your farm has been updated successfully!' : 'Your new farm has been added!',
        );
        setShowForm(false);
        resetForm();
        await fetchFarms();
      } else {
        const errData = await res.json();
        Alert.alert('Error', errData.message || 'Failed to save farm');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (farm: any) => {
    Alert.alert(
      '🗑️ Delete Farm',
      `Are you sure you want to delete "${farm.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/farms/${farm.id || farm._id}/`, { method: 'DELETE' });
              await fetchFarms();
            } catch {
              Alert.alert('Error', 'Failed to delete farm');
            }
          },
        },
      ],
    );
  };

  const totalAcres = farms.reduce((sum, f) => sum + parseFloat(f.land_size_acres || 0), 0);

  const updateField = (key: string, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#059669', '#0d9488']} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={openAddForm} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ Add Farm</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>🏡 My Farms</Text>
        <Text style={s.headerSub}>Manage your farms and land details</Text>

        {/* Stats */}
        {farms.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{farms.length}</Text>
              <Text style={s.statLabel}>Total Farms</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>{totalAcres.toFixed(1)}</Text>
              <Text style={s.statLabel}>Total Acres</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Farm List */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadText}>Loading farms...</Text>
          </View>
        ) : farms.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🚜</Text>
            <Text style={s.emptyTitle}>No farms added yet</Text>
            <Text style={s.emptySub}>Start by adding your first farm to track everything!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAddForm}>
              <Text style={s.emptyBtnText}>+ Add Your First Farm</Text>
            </TouchableOpacity>
          </View>
        ) : (
          farms.map((farm, index) => {
            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
            const emoji = CARD_EMOJIS[index % CARD_EMOJIS.length];
            const soilInfo = SOIL_TYPES.find(st => st.value === farm.soil_type);
            const irrigInfo = IRRIGATION_TYPES.find(it => it.value === farm.irrigation_type);

            return (
              <View key={farm._id || farm.id || index} style={s.card}>
                {/* Card Header */}
                <LinearGradient colors={gradient} style={s.cardHeader}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>{farm.name || 'Farm'}</Text>
                      <Text style={s.cardLocation}>
                        📍 {farm.district || session?.district || ''}, {farm.state || session?.state || ''}
                      </Text>
                    </View>
                    <Text style={s.cardEmoji}>{emoji}</Text>
                  </View>
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEditForm(farm)}>
                      <Text style={s.actionBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(farm)}>
                      <Text style={s.actionBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {/* Card Body */}
                <View style={s.cardBody}>
                  {/* Land Size */}
                  <View style={s.landSizeRow}>
                    <Text style={s.landSizeLabel}>📐 Land Size</Text>
                    <Text style={s.landSizeValue}>{farm.land_size_acres} <Text style={s.landSizeUnit}>acres</Text></Text>
                  </View>

                  {/* Soil & Irrigation */}
                  <View style={s.infoRow}>
                    <View style={[s.infoBox, { backgroundColor: '#fffbeb' }]}>
                      <Text style={s.infoBoxLabel}>Soil Type</Text>
                      <Text style={s.infoBoxValue}>{soilInfo?.icon || '🪨'} {soilInfo?.label || farm.soil_type}</Text>
                    </View>
                    <View style={[s.infoBox, { backgroundColor: '#eff6ff' }]}>
                      <Text style={s.infoBoxLabel}>Irrigation</Text>
                      <Text style={s.infoBoxValue}>{irrigInfo?.icon || '💧'} {irrigInfo?.label || farm.irrigation_type}</Text>
                    </View>
                  </View>

                  {/* Primary Crops */}
                  {farm.primary_crops ? (
                    <View style={s.cropsRow}>
                      <Text style={s.cropsLabel}>🌾 Crops</Text>
                      <Text style={s.cropsValue}>{farm.primary_crops}</Text>
                    </View>
                  ) : null}

                  {/* NPK & pH values */}
                  {(farm.nitrogen_value != null || farm.phosphorus_value != null || farm.potassium_value != null || farm.soil_ph != null) && (
                    <View style={s.nutrientSection}>
                      <Text style={s.nutrientTitle}>🧪 Soil Nutrients</Text>
                      <View style={s.nutrientGrid}>
                        {farm.nitrogen_value != null && (
                          <View style={[s.nutrientBox, { backgroundColor: '#ecfdf5' }]}>
                            <Text style={s.nutrientLabel}>N</Text>
                            <Text style={[s.nutrientValue, { color: '#059669' }]}>{farm.nitrogen_value}</Text>
                          </View>
                        )}
                        {farm.phosphorus_value != null && (
                          <View style={[s.nutrientBox, { backgroundColor: '#eff6ff' }]}>
                            <Text style={s.nutrientLabel}>P</Text>
                            <Text style={[s.nutrientValue, { color: '#2563eb' }]}>{farm.phosphorus_value}</Text>
                          </View>
                        )}
                        {farm.potassium_value != null && (
                          <View style={[s.nutrientBox, { backgroundColor: '#fef3c7' }]}>
                            <Text style={s.nutrientLabel}>K</Text>
                            <Text style={[s.nutrientValue, { color: '#d97706' }]}>{farm.potassium_value}</Text>
                          </View>
                        )}
                        {farm.soil_ph != null && (
                          <View style={[s.nutrientBox, { backgroundColor: '#f5f3ff' }]}>
                            <Text style={s.nutrientLabel}>pH</Text>
                            <Text style={[s.nutrientValue, { color: '#7c3aed' }]}>{farm.soil_ph}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Farm Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={formStyles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={formStyles.sheet}>
              {/* Modal Header */}
              <LinearGradient colors={['#059669', '#0d9488']} style={formStyles.sheetHeader}>
                <Text style={formStyles.sheetTitle}>
                  {editingFarm ? '✏️ Edit Farm' : '🌱 Add New Farm'}
                </Text>
                <TouchableOpacity
                  onPress={() => { setShowForm(false); resetForm(); }}
                  style={formStyles.closeBtn}
                >
                  <Text style={formStyles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                contentContainerStyle={formStyles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Farm Name */}
                <Text style={formStyles.label}>🏷️ FARM NAME *</Text>
                <TextInput
                  style={formStyles.input}
                  placeholder="e.g., Green Valley Farm"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.name}
                  onChangeText={v => updateField('name', v)}
                />

                {/* Land Size */}
                <Text style={[formStyles.label, { marginTop: Spacing.lg }]}>📐 LAND SIZE (ACRES) *</Text>
                <TextInput
                  style={formStyles.input}
                  placeholder="e.g., 2.5"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={formData.land_size_acres}
                  onChangeText={v => updateField('land_size_acres', v)}
                />



                {/* Soil Type */}
                <View style={{ marginTop: Spacing.lg }}>
                  <OptionPicker
                    label="🧱 SOIL TYPE"
                    value={formData.soil_type}
                    options={SOIL_TYPES}
                    placeholder="Select Soil Type"
                    onSelect={v => updateField('soil_type', v)}
                  />
                </View>

                {/* Irrigation Type */}
                <View style={{ marginTop: Spacing.lg }}>
                  <OptionPicker
                    label="💧 IRRIGATION TYPE"
                    value={formData.irrigation_type}
                    options={IRRIGATION_TYPES}
                    placeholder="Select Irrigation Type"
                    onSelect={v => updateField('irrigation_type', v)}
                  />
                </View>

                {/* Soil Nutrients Section */}
                <View style={formStyles.nutrientSection}>
                  <Text style={formStyles.nutrientSectionTitle}>🧪 Soil Nutrients & pH Levels *</Text>
                  <Text style={formStyles.nutrientSectionSub}>Required — used for smart crop recommendations</Text>

                  <View style={formStyles.nutrientRow}>
                    <View style={formStyles.nutrientInput}>
                      <Text style={formStyles.nutrientLabel}>Nitrogen (N)</Text>
                      <Text style={formStyles.nutrientRange}>0 – 140</Text>
                      <TextInput
                        style={formStyles.inputSmall}
                        placeholder="e.g., 40"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        value={formData.nitrogen_value}
                        onChangeText={v => updateField('nitrogen_value', v)}
                      />
                    </View>
                    <View style={formStyles.nutrientInput}>
                      <Text style={formStyles.nutrientLabel}>Phosphorus (P)</Text>
                      <Text style={formStyles.nutrientRange}>0 – 145</Text>
                      <TextInput
                        style={formStyles.inputSmall}
                        placeholder="e.g., 60"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        value={formData.phosphorus_value}
                        onChangeText={v => updateField('phosphorus_value', v)}
                      />
                    </View>
                  </View>

                  <View style={formStyles.nutrientRow}>
                    <View style={formStyles.nutrientInput}>
                      <Text style={formStyles.nutrientLabel}>Potassium (K)</Text>
                      <Text style={formStyles.nutrientRange}>0 – 205</Text>
                      <TextInput
                        style={formStyles.inputSmall}
                        placeholder="e.g., 50"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        value={formData.potassium_value}
                        onChangeText={v => updateField('potassium_value', v)}
                      />
                    </View>
                    <View style={formStyles.nutrientInput}>
                      <Text style={formStyles.nutrientLabel}>Soil pH</Text>
                      <Text style={formStyles.nutrientRange}>0 – 14</Text>
                      <TextInput
                        style={formStyles.inputSmall}
                        placeholder="e.g., 6.5"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        value={formData.soil_ph}
                        onChangeText={v => updateField('soil_ph', v)}
                      />
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={formStyles.btnRow}>
                  <TouchableOpacity
                    style={formStyles.cancelBtn}
                    onPress={() => { setShowForm(false); resetForm(); }}
                  >
                    <Text style={formStyles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[formStyles.submitBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={formStyles.submitText}>  Saving...</Text>
                      </View>
                    ) : (
                      <Text style={formStyles.submitText}>
                        {editingFarm ? '💾 Update Farm' : '🌱 Add Farm'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backBtn: { paddingVertical: Spacing.sm },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, fontWeight: '600' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtnText: { color: '#059669', fontSize: FontSize.sm, fontWeight: '800' },
  headerTitle: { fontSize: FontSize.xxl + 4, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },

  // Content
  scroll: { padding: Spacing.xl, paddingTop: Spacing.xl },
  centered: { alignItems: 'center', paddingTop: 80 },
  loadText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600', marginTop: Spacing.md },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xxxl,
    borderWidth: 2,
    borderColor: Colors.primaryBorder,
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  // Farm Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardHeader: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: { fontSize: FontSize.xl, fontWeight: '900', color: '#fff', marginBottom: 4 },
  cardLocation: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardEmoji: { fontSize: 40, opacity: 0.3 },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
  },
  actionBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  // Card Body
  cardBody: { padding: Spacing.xl },
  landSizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  landSizeLabel: { fontSize: FontSize.sm, fontWeight: '700', color: '#047857' },
  landSizeValue: { fontSize: FontSize.xl, fontWeight: '900', color: '#065f46' },
  landSizeUnit: { fontSize: FontSize.sm, fontWeight: '600' },

  infoRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  infoBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  infoBoxLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoBoxValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

  cropsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cropsLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  cropsValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

  nutrientSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  nutrientTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  nutrientGrid: { flexDirection: 'row', gap: Spacing.sm },
  nutrientBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  nutrientLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, marginBottom: 2 },
  nutrientValue: { fontSize: FontSize.lg, fontWeight: '900' },
});

// ─── Form Modal Styles ──────────────────────────────────────────────
const formStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
  },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' },

  formScroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },

  label: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg - 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
  },

  // Picker
  picker: {
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg - 2,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  pickerPlaceholder: { color: Colors.textMuted },
  pickerArrow: { fontSize: 10, color: Colors.textMuted, marginLeft: 8 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 20, color: Colors.textMuted, fontWeight: '700', padding: 8 },
  optionRow: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRowActive: { backgroundColor: Colors.primaryBg },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionCheck: { fontSize: 16, color: Colors.primary, fontWeight: '800' },

  // Nutrient Section
  nutrientSection: {
    marginTop: Spacing.xxl,
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  nutrientSectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: '#065f46', marginBottom: 2 },
  nutrientSectionSub: { fontSize: FontSize.xs, color: '#047857', marginBottom: Spacing.lg, fontWeight: '500' },
  nutrientRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  nutrientInput: { flex: 1 },
  nutrientLabel: { fontSize: FontSize.xs, fontWeight: '700', color: '#047857', marginBottom: 2 },
  nutrientRange: { fontSize: 9, color: Colors.textMuted, marginBottom: Spacing.sm },
  inputSmall: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: {
    flex: 2,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: { fontSize: FontSize.md, fontWeight: '800', color: '#fff' },
});

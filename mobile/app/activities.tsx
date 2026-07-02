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

const ACTIVITY_TYPES = [
  { value: 'sowing', label: 'Sowing', icon: '🌱' },
  { value: 'irrigation', label: 'Irrigation', icon: '💧' },
  { value: 'fertilizer', label: 'Fertilizer', icon: '🧪' },
  { value: 'pesticide', label: 'Pesticide', icon: '🛡️' },
  { value: 'weeding', label: 'Weeding', icon: '🌿' },
  { value: 'harvesting', label: 'Harvesting', icon: '🌾' },
  { value: 'pest_issue', label: 'Pest Issue', icon: '🐛' },
  { value: 'disease_issue', label: 'Disease Issue', icon: '🦠' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; card: string }> = {
  sowing: { bg: '#ecfdf5', text: '#059669', card: '#d1fae5' },
  irrigation: { bg: '#eff6ff', text: '#2563eb', card: '#dbeafe' },
  fertilizer: { bg: '#ecfdf5', text: '#0d9488', card: '#ccfbf1' },
  pesticide: { bg: '#f5f3ff', text: '#7c3aed', card: '#ede9fe' },
  weeding: { bg: '#fffbeb', text: '#d97706', card: '#fef3c7' },
  harvesting: { bg: '#fff7ed', text: '#ea580c', card: '#fed7aa' },
  pest_issue: { bg: '#fef2f2', text: '#dc2626', card: '#fecaca' },
  disease_issue: { bg: '#fef2f2', text: '#e11d48', card: '#fecdd3' },
  other: { bg: '#f8fafc', text: '#64748b', card: '#e2e8f0' },
};

// Dropdown picker
function OptionPicker({
  label, value, options, onSelect, placeholder,
}: {
  label: string; value: string;
  options: { value: string; label: string; icon: string }[];
  onSelect: (val: string) => void; placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View>
      <Text style={fs.label}>{label}</Text>
      <TouchableOpacity style={fs.picker} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={[fs.pickerText, !value && fs.pickerPlaceholder]}>
          {selected ? `${selected.icon} ${selected.label}` : placeholder}
        </Text>
        <Text style={fs.pickerArrow}>▼</Text>
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={fs.modalOverlay}>
          <View style={fs.modalCard}>
            <View style={fs.modalHeader}>
              <Text style={fs.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={fs.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[fs.optionRow, item.value === value && fs.optionRowActive]}
                  onPress={() => { onSelect(item.value); setVisible(false); }}
                >
                  <Text style={fs.optionText}>{item.icon} {item.label}</Text>
                  {item.value === value && <Text style={fs.optionCheck}>✓</Text>}
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

export default function ActivitiesScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);

  const [formData, setFormData] = useState({
    farm: '',
    activity_type: 'irrigation',
    text_note: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async (forceInsights = false) => {
    try {
      const sess = await storage.getSession();
      setSession(sess);
      if (!sess?.userId) return;

      // Fetch farms and activities in parallel
      const [farmsRes, actRes] = await Promise.all([
        apiFetch(`/api/farms/?farmer=${sess.userId}`),
        apiFetch(`/api/activities/?farmer_id=${sess.userId}&limit=50`),
      ]);

      const farmsData = await farmsRes.json();
      setFarms(Array.isArray(farmsData) ? farmsData : (farmsData.results || []));

      const actData = await actRes.json();
      setActivities(Array.isArray(actData) ? actData : (actData.results || []));

      // Fetch AI insights
      fetchInsights(sess.userId);
    } catch (err) {
      console.warn('Activity fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async (farmerId: string) => {
    setLoadingInsights(true);
    try {
      const insRes = await apiFetch(`/api/activities/insights?farmer_id=${farmerId}`);
      if (insRes.ok) {
        const insData = await insRes.json();
        setInsights(insData);
      }
    } catch (err) {
      console.warn('Insights fetch error:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!formData.farm) {
      Alert.alert('Error', 'Please select a farm');
      return;
    }
    if (!formData.text_note.trim()) {
      Alert.alert('Error', 'Please add a note describing the activity');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/activities/quick_add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: session?.userId,
          farm: formData.farm,
          activity_type: formData.activity_type,
          text_note: formData.text_note.trim(),
          date: formData.date,
        }),
      });

      if (res.ok || res.status === 201) {
        Alert.alert('✅ Activity Logged', 'Your activity has been recorded and AI insights will be updated!');
        setShowForm(false);
        setFormData({ farm: '', activity_type: 'irrigation', text_note: '', date: new Date().toISOString().split('T')[0] });
        await fetchData(true);
      } else {
        const errData = await res.json();
        Alert.alert('Error', errData.message || 'Failed to log activity');
      }
    } catch {
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (activity: any) => {
    Alert.alert(
      '🗑️ Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/activities/${activity.id || activity._id}/`, { method: 'DELETE' });
              await fetchData(true);
            } catch {}
          },
        },
      ],
    );
  };

  const getTypeInfo = (type: string) => ACTIVITY_TYPES.find(a => a.value === type) || ACTIVITY_TYPES[8];
  const getTypeColor = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.other;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#7c3aed', '#a855f7']} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ Log Activity</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>📊 Activity Tracking</Text>
        <Text style={s.headerSub}>Log activities & get AI-powered insights</Text>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{activities.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{activities.filter(a => { const d = new Date(a.date); return d >= today; }).length}</Text>
            <Text style={s.statLabel}>This Week</Text>
          </View>
          <TouchableOpacity
            style={[s.statBox, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
            onPress={() => setShowInsights(true)}
            activeOpacity={0.7}
          >
            <Text style={s.statValue}>🧠</Text>
            <Text style={s.statLabel}>AI Insights</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Activity List */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={s.loadText}>Loading activities...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📝</Text>
            <Text style={s.emptyTitle}>No activities logged yet</Text>
            <Text style={s.emptySub}>Start logging farming activities to get personalized AI recommendations!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowForm(true)}>
              <Text style={s.emptyBtnText}>+ Log Your First Activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.listTitle}>📋 All Activities ({activities.length})</Text>
            {activities.map((activity, index) => {
              const typeInfo = getTypeInfo(activity.activity_type);
              const typeColor = getTypeColor(activity.activity_type);
              const actDate = new Date(activity.date);
              const isUpcoming = actDate > today;
              const daysAway = isUpcoming ? Math.ceil((actDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <View key={activity._id || activity.id || index} style={s.card}>
                  {/* Left color strip */}
                  <View style={[s.cardStrip, { backgroundColor: typeColor.text }]} />

                  {/* Icon */}
                  <View style={[s.cardIcon, { backgroundColor: typeColor.bg }]}>
                    <Text style={s.cardIconText}>{typeInfo.icon}</Text>
                  </View>

                  {/* Content */}
                  <View style={s.cardContent}>
                    <View style={s.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{typeInfo.label}</Text>
                        <View style={[s.typeBadge, { backgroundColor: typeColor.card }]}>
                          <Text style={[s.typeBadgeText, { color: typeColor.text }]}>
                            {activity.activity_type.toUpperCase().replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {isUpcoming && daysAway != null && (
                          <View style={s.upcomingBadge}>
                            <Text style={s.upcomingText}>⏳ In {daysAway}d</Text>
                          </View>
                        )}
                        <Text style={s.dateText}>{formatDate(activity.date)}</Text>
                      </View>
                    </View>

                    {/* Note */}
                    {activity.text_note ? (
                      <View style={s.noteBox}>
                        <Text style={s.noteText}>{activity.text_note}</Text>
                      </View>
                    ) : null}

                    {/* Footer */}
                    <View style={s.cardFooter}>
                      {activity.farm_name ? (
                        <View style={s.farmTag}>
                          <Text style={s.farmTagText}>🏡 {activity.farm_name}</Text>
                        </View>
                      ) : <View />}
                      <TouchableOpacity onPress={() => handleDelete(activity)} style={s.deleteBtn}>
                        <Text style={s.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Activity Breakdown */}
            <View style={s.breakdownCard}>
              <Text style={s.breakdownTitle}>📈 Activity Breakdown</Text>
              {ACTIVITY_TYPES.map((t) => {
                const cnt = activities.filter(a => a.activity_type === t.value).length;
                if (cnt === 0) return null;
                const pct = Math.round((cnt / activities.length) * 100);
                const tc = getTypeColor(t.value);
                return (
                  <View key={t.value} style={s.barRow}>
                    <View style={s.barLabel}>
                      <Text style={s.barIcon}>{t.icon}</Text>
                      <Text style={s.barName}>{t.label}</Text>
                    </View>
                    <Text style={s.barCount}>{cnt} · {pct}%</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: tc.text }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Log Activity Modal ─────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={fs.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={fs.sheet}>
              <LinearGradient colors={['#6366f1', '#7c3aed']} style={fs.sheetHeader}>
                <Text style={fs.sheetTitle}>📝 Log Activity</Text>
                <TouchableOpacity onPress={() => setShowForm(false)} style={fs.closeBtn}>
                  <Text style={fs.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView contentContainerStyle={fs.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Select Farm */}
                <OptionPicker
                  label="🏡 SELECT FARM *"
                  value={formData.farm}
                  options={farms.map(f => ({ value: f.id || f._id, label: f.name || 'Farm', icon: '🏡' }))}
                  placeholder="Choose a farm"
                  onSelect={v => setFormData(prev => ({ ...prev, farm: v }))}
                />

                {/* Activity Type */}
                <View style={{ marginTop: Spacing.lg }}>
                  <OptionPicker
                    label="🔧 ACTIVITY TYPE *"
                    value={formData.activity_type}
                    options={ACTIVITY_TYPES}
                    placeholder="Select activity type"
                    onSelect={v => setFormData(prev => ({ ...prev, activity_type: v }))}
                  />
                </View>

                {/* Date */}
                <Text style={[fs.label, { marginTop: Spacing.lg }]}>📅 DATE *</Text>
                <TextInput
                  style={fs.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.date}
                  onChangeText={v => setFormData(prev => ({ ...prev, date: v }))}
                />
                <Text style={fs.dateHint}>
                  Today: {new Date().toISOString().split('T')[0]} · Future dates = scheduled
                </Text>

                {/* Notes */}
                <Text style={[fs.label, { marginTop: Spacing.lg }]}>📝 NOTES & DETAILS *</Text>
                <TextInput
                  style={[fs.input, fs.textArea]}
                  placeholder="Describe what was done or needs to be done..."
                  placeholderTextColor={Colors.textMuted}
                  value={formData.text_note}
                  onChangeText={v => setFormData(prev => ({ ...prev, text_note: v }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Info Note */}
                <View style={fs.infoNote}>
                  <Text style={fs.infoNoteText}>
                    🧠 Your activities are analyzed by AI to provide personalized farming recommendations, productivity scores, and risk alerts.
                  </Text>
                </View>

                {/* Buttons */}
                <View style={fs.btnRow}>
                  <TouchableOpacity style={fs.cancelBtn} onPress={() => setShowForm(false)}>
                    <Text style={fs.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[fs.submitBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={fs.submitText}>  Saving...</Text>
                      </View>
                    ) : (
                      <Text style={fs.submitText}>✅ Log Activity</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── AI Insights Modal ──────────────────────────────── */}
      <Modal visible={showInsights} animationType="slide" transparent>
        <View style={fs.overlay}>
          <View style={ins.sheet}>
            <LinearGradient colors={['#7c3aed', '#4f46e5', '#2563eb']} style={ins.insHeader}>
              <View style={ins.insHeaderRow}>
                <View>
                  <View style={ins.aiBadge}>
                    <View style={ins.aiDot} />
                    <Text style={ins.aiBadgeText}>AI-Powered</Text>
                  </View>
                  <Text style={ins.insTitle}>Smart Insights</Text>
                  <Text style={ins.insSub}>Personalized farming advice</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInsights(false)} style={ins.closeBtn}>
                  <Text style={ins.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={ins.insScroll} showsVerticalScrollIndicator={false}>
              {loadingInsights ? (
                <View style={ins.loadingWrap}>
                  <ActivityIndicator size="large" color="#7c3aed" />
                  <Text style={ins.loadingText}>Analyzing your farm patterns...</Text>
                </View>
              ) : insights?.insights ? (
                <>
                  {/* Productivity Score */}
                  <View style={[ins.scoreCard, {
                    backgroundColor: (insights.insights.productivity_score >= 80 ? '#ecfdf5' :
                      insights.insights.productivity_score >= 50 ? '#fffbeb' : '#fef2f2'),
                    borderColor: (insights.insights.productivity_score >= 80 ? '#a7f3d0' :
                      insights.insights.productivity_score >= 50 ? '#fde68a' : '#fecaca'),
                  }]}>
                    <Text style={ins.scoreValue}>{insights.insights.productivity_score}</Text>
                    <Text style={ins.scoreMax}>/100</Text>
                    <Text style={[ins.scoreLabel, {
                      color: (insights.insights.productivity_score >= 80 ? '#059669' :
                        insights.insights.productivity_score >= 50 ? '#d97706' : '#dc2626'),
                    }]}>{insights.insights.productivity_label}</Text>
                  </View>

                  {/* Weekly Summary */}
                  {insights.insights.weekly_summary && (
                    <View style={ins.infoCard}>
                      <Text style={ins.infoCardLabel}>📅 THIS WEEK</Text>
                      <Text style={ins.infoCardText}>{insights.insights.weekly_summary}</Text>
                    </View>
                  )}

                  {/* Top Recommendation */}
                  <View style={[ins.infoCard, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                    <Text style={[ins.infoCardLabel, { color: '#6366f1' }]}>✨ TOP RECOMMENDATION</Text>
                    <Text style={[ins.infoCardText, { color: '#3730a3' }]}>{insights.insights.top_recommendation}</Text>
                  </View>

                  {/* Risk Alert */}
                  {insights.insights.risk_alert &&
                    !insights.insights.risk_alert.toLowerCase().includes('no risk') &&
                    !insights.insights.risk_alert.toLowerCase().includes('no current risk') && (
                    <View style={[ins.infoCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Text style={[ins.infoCardLabel, { color: '#dc2626' }]}>⚠️ RISK ALERT</Text>
                      <Text style={[ins.infoCardText, { color: '#991b1b' }]}>{insights.insights.risk_alert}</Text>
                    </View>
                  )}

                  {/* Focus Areas */}
                  {insights.insights.next_actions?.length > 0 && (
                    <View style={ins.focusSection}>
                      <Text style={ins.focusSectionTitle}>🎯 FOCUS AREAS</Text>
                      {insights.insights.next_actions.map((action: string, i: number) => (
                        <View key={i} style={ins.focusItem}>
                          <View style={ins.focusNum}>
                            <Text style={ins.focusNumText}>{i + 1}</Text>
                          </View>
                          <Text style={ins.focusText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Pattern & Streak */}
                  {insights.insights.pattern_insight &&
                    !insights.insights.pattern_insight.toLowerCase().includes('log more') && (
                    <View style={[ins.infoCard, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
                      <Text style={[ins.infoCardLabel, { color: '#7c3aed' }]}>🔍 PATTERN</Text>
                      <Text style={[ins.infoCardText, { color: '#4c1d95' }]}>{insights.insights.pattern_insight}</Text>
                    </View>
                  )}

                  {insights.insights.streak_info && (
                    <View style={[ins.infoCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                      <Text style={[ins.infoCardLabel, { color: '#ea580c' }]}>🔥 STREAK</Text>
                      <Text style={[ins.infoCardText, { color: '#9a3412' }]}>{insights.insights.streak_info}</Text>
                    </View>
                  )}

                  {/* Seasonal Tip */}
                  {insights.insights.seasonal_tip && (
                    <View style={[ins.infoCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                      <Text style={[ins.infoCardLabel, { color: '#059669' }]}>🌤️ SEASONAL TIP</Text>
                      <Text style={[ins.infoCardText, { color: '#064e3b' }]}>{insights.insights.seasonal_tip}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={ins.loadingWrap}>
                  <Text style={{ fontSize: 48 }}>📊</Text>
                  <Text style={ins.loadingText}>Log activities to unlock AI insights</Text>
                </View>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  backBtn: { paddingVertical: Spacing.sm },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, fontWeight: '600' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  addBtnText: { color: '#7c3aed', fontSize: FontSize.sm, fontWeight: '800' },
  headerTitle: { fontSize: FontSize.xxl + 4, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },

  scroll: { padding: Spacing.xl, paddingTop: Spacing.lg },
  centered: { alignItems: 'center', paddingTop: 80 },
  loadText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600', marginTop: Spacing.md },

  emptyState: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl,
    backgroundColor: '#fff', borderRadius: BorderRadius.xxl, paddingBottom: Spacing.xxxl,
    borderWidth: 2, borderColor: '#c4b5fd', borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: '#7c3aed', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  listTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },

  // Activity Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: Spacing.md,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  cardStrip: { width: 5 },
  cardIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: Spacing.md, marginTop: Spacing.lg,
  },
  cardIconText: { fontSize: 24 },
  cardContent: { flex: 1, padding: Spacing.lg, paddingLeft: Spacing.md },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md + 1, fontWeight: '800', color: Colors.text },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dateText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  upcomingBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#fecaca' },
  upcomingText: { fontSize: 10, fontWeight: '800', color: '#e11d48' },
  noteBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.divider },
  noteText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  farmTag: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  farmTagText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: Spacing.xl, marginTop: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  breakdownTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  barRow: { marginBottom: Spacing.md },
  barLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  barIcon: { fontSize: 14 },
  barName: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  barCount: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  barTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});

// ─── Form Modal Styles ──────────────────────────────────────────────
const fs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xl },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  formScroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: 40 },

  label: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, marginBottom: Spacing.sm, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bg, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg - 2,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 2, borderColor: Colors.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: Spacing.md },
  dateHint: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },

  // Picker
  picker: {
    backgroundColor: Colors.bg, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg - 2,
    borderWidth: 2, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  pickerPlaceholder: { color: Colors.textMuted },
  pickerArrow: { fontSize: 10, color: Colors.textMuted, marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxl, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 20, color: Colors.textMuted, fontWeight: '700', padding: 8 },
  optionRow: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, borderBottomWidth: 1, borderBottomColor: Colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionRowActive: { backgroundColor: '#f5f3ff' },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionCheck: { fontSize: 16, color: '#7c3aed', fontWeight: '800' },

  // Info note
  infoNote: { backgroundColor: '#f5f3ff', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.xl, borderWidth: 1, borderColor: '#ddd6fe' },
  infoNoteText: { fontSize: FontSize.xs, color: '#4c1d95', lineHeight: 18, fontWeight: '600' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  cancelBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: {
    flex: 2, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center',
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitText: { fontSize: FontSize.md, fontWeight: '800', color: '#fff' },
});

// ─── Insights Modal Styles ──────────────────────────────────────────
const ins = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#fff', marginTop: Platform.OS === 'ios' ? 50 : 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  insHeader: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl, paddingTop: Spacing.xxl + 4 },
  insHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, marginBottom: Spacing.sm, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  aiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 6 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  insTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: '#fff', marginBottom: 2 },
  insSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  insScroll: { padding: Spacing.xl },

  loadingWrap: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  loadingText: { fontSize: FontSize.md, color: '#7c3aed', fontWeight: '600', marginTop: Spacing.lg },

  // Score
  scoreCard: { alignItems: 'center', padding: Spacing.xxl, borderRadius: 20, borderWidth: 1.5, marginBottom: Spacing.lg },
  scoreValue: { fontSize: 56, fontWeight: '900', color: Colors.text, letterSpacing: -2 },
  scoreMax: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600', marginTop: -4 },
  scoreLabel: { fontSize: FontSize.md, fontWeight: '800', marginTop: Spacing.sm },

  // Info Cards
  infoCard: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  infoCardLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  infoCardText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20, fontWeight: '600' },

  // Focus Areas
  focusSection: { marginBottom: Spacing.md },
  focusSectionTitle: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: Spacing.md },
  focusItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#f8fafc', padding: Spacing.md, borderRadius: 14, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.divider },
  focusNum: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  focusNumText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  focusText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, fontWeight: '600' },
});

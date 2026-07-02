import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Modal,
  Alert, Platform, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';

const CATEGORIES = [
  { value: 'operation', label: 'Operation', icon: '🔧' },
  { value: 'scheme', label: 'Scheme', icon: '🏛️' },
  { value: 'price', label: 'Market Price', icon: '💰' },
  { value: 'weather', label: 'Weather', icon: '☀️' },
  { value: 'pest', label: 'Pest/Disease', icon: '🐛' },
  { value: 'general', label: 'General', icon: '📋' },
];

const PRIORITIES = [
  { value: 'high', label: 'High', icon: '🔴', color: '#dc2626', bg: '#fef2f2' },
  { value: 'medium', label: 'Medium', icon: '🟡', color: '#d97706', bg: '#fffbeb' },
  { value: 'low', label: 'Low', icon: '🟢', color: '#059669', bg: '#ecfdf5' },
];

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

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const [formData, setFormData] = useState({
    farm: '',
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    category: 'general',
    priority: 'medium',
  });

  const fetchData = async () => {
    try {
      const sess = await storage.getSession();
      setSession(sess);
      if (!sess?.userId) return;

      const [remRes, farmRes] = await Promise.all([
        apiFetch(`/api/reminders/?farmer=${sess.userId}&limit=50`),
        apiFetch(`/api/farms/?farmer=${sess.userId}`),
      ]);

      const remData = await remRes.json();
      setReminders(Array.isArray(remData) ? remData : (remData.results || []));

      const farmData = await farmRes.json();
      setFarms(Array.isArray(farmData) ? farmData : (farmData.results || []));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const resetForm = () => setFormData({
    farm: '', title: '', description: '',
    due_date: new Date().toISOString().split('T')[0],
    category: 'general', priority: 'medium',
  });

  const handleSubmit = async () => {
    if (!formData.farm) { Alert.alert('Error', 'Please select a farm'); return; }
    if (!formData.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!formData.due_date) { Alert.alert('Error', 'Due date is required'); return; }

    setSaving(true);
    try {
      const res = await apiFetch('/api/reminders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: session?.userId,
          farm: formData.farm,
          title: formData.title.trim(),
          description: formData.description.trim(),
          due_date: formData.due_date,
          category: formData.category,
          priority: formData.priority,
        }),
      });

      if (res.ok || res.status === 201) {
        Alert.alert('🔔 Reminder Created', 'Your reminder has been set!');
        setShowForm(false);
        resetForm();
        await fetchData();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to create reminder');
      }
    } catch { Alert.alert('Error', 'Unable to connect to server'); }
    finally { setSaving(false); }
  };

  const toggleComplete = async (reminder: any) => {
    try {
      const id = reminder.id || reminder._id;
      await apiFetch(`/api/reminders/${id}/mark_completed/`, { method: 'POST' });
      await fetchData();
    } catch { Alert.alert('Error', 'Failed to update reminder'); }
  };

  const handleDelete = (reminder: any) => {
    Alert.alert('🗑️ Delete Reminder', `Delete "${reminder.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/reminders/${reminder.id || reminder._id}/`, { method: 'DELETE' });
            await fetchData();
          } catch {}
        },
      },
    ]);
  };

  const now = new Date();
  const filtered = reminders.filter(r => {
    if (filter === 'pending') return !r.is_completed;
    if (filter === 'completed') return r.is_completed;
    return true;
  });

  const pending = reminders.filter(r => !r.is_completed).length;
  const completed = reminders.filter(r => r.is_completed).length;
  const overdue = reminders.filter(r => !r.is_completed && new Date(r.due_date) < now).length;

  const getPriorityInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];
  const getCatInfo = (c: string) => CATEGORIES.find(ct => ct.value === c) || CATEGORIES[5];

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#d97706', '#ea580c', '#dc2626']} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => { resetForm(); setShowForm(true); }} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ New Reminder</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>🔔 Reminders</Text>
        <Text style={s.headerSub}>Stay on top of your farming tasks</Text>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{pending}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{completed}</Text>
            <Text style={s.statLabel}>Done</Text>
          </View>
          <View style={[s.statBox, overdue > 0 && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={s.statValue}>{overdue}</Text>
            <Text style={s.statLabel}>Overdue</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['all', 'pending', 'completed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? `All (${reminders.length})` : f === 'pending' ? `Pending (${pending})` : `Done (${completed})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reminder List */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#d97706" />
            <Text style={s.loadText}>Loading reminders...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyTitle}>
              {filter === 'all' ? 'No reminders yet' : filter === 'pending' ? 'No pending reminders' : 'No completed reminders'}
            </Text>
            <Text style={s.emptySub}>Create reminders to stay organized with your farming tasks</Text>
            {filter === 'all' && (
              <TouchableOpacity style={s.emptyBtn} onPress={() => { resetForm(); setShowForm(true); }}>
                <Text style={s.emptyBtnText}>+ Create First Reminder</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((r, index) => {
            const due = new Date(r.due_date);
            const isOverdue = due < now && !r.is_completed;
            const pri = getPriorityInfo(r.priority);
            const cat = getCatInfo(r.category);
            const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <View
                key={r._id || r.id || index}
                style={[s.card, isOverdue && s.cardOverdue, r.is_completed && s.cardCompleted]}
              >
                {/* Priority strip */}
                <View style={[s.cardStrip, { backgroundColor: pri.color }]} />

                <View style={s.cardBody}>
                  {/* Top row */}
                  <View style={s.cardTopRow}>
                    {/* Toggle complete */}
                    <TouchableOpacity
                      style={[s.checkBox, r.is_completed && s.checkBoxDone]}
                      onPress={() => toggleComplete(r)}
                    >
                      {r.is_completed && <Text style={s.checkMark}>✓</Text>}
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={[s.cardTitle, r.is_completed && s.cardTitleDone]}>{r.title}</Text>
                      {r.description ? <Text style={s.cardDesc}>{r.description}</Text> : null}
                    </View>

                    <TouchableOpacity onPress={() => handleDelete(r)} style={s.deleteBtn}>
                      <Text style={s.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Meta row */}
                  <View style={s.metaRow}>
                    {/* Due date */}
                    <View style={[s.dueBadge, isOverdue && s.dueBadgeOverdue]}>
                      <Text style={[s.dueText, isOverdue && s.dueTextOverdue]}>
                        📅 {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isOverdue ? ' · Overdue!' : daysUntil >= 0 && daysUntil <= 3 ? ` · ${daysUntil}d left` : ''}
                      </Text>
                    </View>

                    {/* Category */}
                    <View style={s.catBadge}>
                      <Text style={s.catText}>{cat.icon} {cat.label}</Text>
                    </View>

                    {/* Priority */}
                    <View style={[s.priBadge, { backgroundColor: pri.bg }]}>
                      <Text style={[s.priText, { color: pri.color }]}>{pri.icon} {pri.label}</Text>
                    </View>
                  </View>

                  {/* Farm name */}
                  {r.farm_name && (
                    <View style={s.farmRow}>
                      <Text style={s.farmText}>🏡 {r.farm_name}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Add Reminder Modal ─────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={fs.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={fs.sheet}>
              <LinearGradient colors={['#d97706', '#ea580c']} style={fs.sheetHeader}>
                <Text style={fs.sheetTitle}>🔔 New Reminder</Text>
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

                {/* Title */}
                <Text style={[fs.label, { marginTop: Spacing.lg }]}>📌 TITLE *</Text>
                <TextInput
                  style={fs.input}
                  placeholder="e.g., Apply fertilizer to paddy field"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.title}
                  onChangeText={v => setFormData(prev => ({ ...prev, title: v }))}
                />

                {/* Description */}
                <Text style={[fs.label, { marginTop: Spacing.lg }]}>📝 DESCRIPTION</Text>
                <TextInput
                  style={[fs.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.md }]}
                  placeholder="Add details..."
                  placeholderTextColor={Colors.textMuted}
                  value={formData.description}
                  onChangeText={v => setFormData(prev => ({ ...prev, description: v }))}
                  multiline
                  numberOfLines={3}
                />

                {/* Due Date */}
                <Text style={[fs.label, { marginTop: Spacing.lg }]}>📅 DUE DATE *</Text>
                <TextInput
                  style={fs.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.due_date}
                  onChangeText={v => setFormData(prev => ({ ...prev, due_date: v }))}
                />
                <Text style={fs.hint}>Today: {new Date().toISOString().split('T')[0]}</Text>

                {/* Category & Priority Row */}
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
                  <View style={{ flex: 1 }}>
                    <OptionPicker
                      label="📋 CATEGORY"
                      value={formData.category}
                      options={CATEGORIES}
                      placeholder="Select"
                      onSelect={v => setFormData(prev => ({ ...prev, category: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <OptionPicker
                      label="⚡ PRIORITY"
                      value={formData.priority}
                      options={PRIORITIES}
                      placeholder="Select"
                      onSelect={v => setFormData(prev => ({ ...prev, priority: v }))}
                    />
                  </View>
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
                      <Text style={fs.submitText}>🔔 Set Reminder</Text>
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

// ─── Main Styles ─────────────────────────────────────────────────────
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
  addBtnText: { color: '#d97706', fontSize: FontSize.sm, fontWeight: '800' },
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

  // Filter tabs
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm,
  },
  filterTab: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.lg,
    alignItems: 'center', backgroundColor: '#f1f5f9',
  },
  filterTabActive: { backgroundColor: '#d97706' },
  filterText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { color: '#fff' },

  scroll: { padding: Spacing.xl, paddingTop: Spacing.md },
  centered: { alignItems: 'center', paddingTop: 80 },
  loadText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600', marginTop: Spacing.md },

  emptyState: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl,
    backgroundColor: '#fff', borderRadius: BorderRadius.xxl, paddingBottom: Spacing.xxxl,
    borderWidth: 2, borderColor: '#fde68a', borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: '#d97706', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: Spacing.md,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  cardOverdue: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  cardCompleted: { opacity: 0.7, backgroundColor: '#fafafa' },
  cardStrip: { width: 5 },
  cardBody: { flex: 1, padding: Spacing.lg },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },

  checkBox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', marginTop: 2,
  },
  checkBoxDone: { backgroundColor: '#059669', borderColor: '#059669' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '900' },

  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  cardTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 16 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  dueBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dueBadgeOverdue: { backgroundColor: '#fef2f2' },
  dueText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  dueTextOverdue: { color: '#dc2626' },
  catBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  priBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priText: { fontSize: 10, fontWeight: '800' },

  farmRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  farmText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
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
  hint: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },

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
  optionRowActive: { backgroundColor: '#fffbeb' },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionCheck: { fontSize: 16, color: '#d97706', fontWeight: '800' },

  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  cancelBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: {
    flex: 2, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center',
    backgroundColor: '#d97706',
    shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitText: { fontSize: FontSize.md, fontWeight: '800', color: '#fff' },
});

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';

export default function OfficersScreen() {
  const router = useRouter();
  const [officers, setOfficers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'officers' | 'consultants'>('consultants');

  const fetchOfficers = async () => {
    try {
      const res = await apiFetch('/api/officers/');
      const data = await res.json();
      setOfficers(data.data || (Array.isArray(data) ? data : (data.results || data.officers || [])));
    } catch {}
  };

  const fetchConsultants = async () => {
    try {
      const res = await apiFetch('/api/consultants/');
      const data = await res.json();
      setConsultants(data.data || []);
    } catch {}
  };

  useEffect(() => {
    Promise.all([fetchOfficers(), fetchConsultants()]).finally(() => setLoading(false));
  }, []);

  const startVideoCall = (consultant: any) => {
    const roomId = `call_${consultant._id}_${Date.now()}`;
    router.push({
      pathname: '/video-call',
      params: {
        roomId,
        consultantName: consultant.name,
        consultantId: consultant._id,
      },
    } as any);
  };

  const renderOfficerCard = (o: any, i: number) => (
    <View key={o._id || i} style={s.card}>
      <View style={s.avatarWrap}>
        <Text style={s.avatarText}>{(o.name || 'O').charAt(0)}</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.name}>{o.name || 'Officer'}</Text>
        <Text style={s.role}>{o.designation || o.role || 'Agricultural Officer'}</Text>
        {o.specialization && <Text style={s.spec}>🎓 {o.specialization}</Text>}
        <Text style={s.location}>📍 {o.district || ''}, {o.state || ''}</Text>
        {o.phone && (
          <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${o.phone}`)}>
            <Text style={s.callText}>📞 Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderConsultantCard = (c: any, i: number) => (
    <View key={c._id || i} style={s.consultantCard}>
      <View style={s.consultantHeader}>
        <View style={s.consultantAvatar}>
          <Text style={s.consultantAvatarText}>{(c.name || 'C').charAt(0)}</Text>
        </View>
        <View style={s.consultantInfo}>
          <Text style={s.consultantName}>{c.name}</Text>
          <Text style={s.consultantDesig}>{c.designation}</Text>
          <View style={s.onlineBadge}>
            <View style={[s.onlineDot, { backgroundColor: c.is_online ? '#48bb78' : '#a0aec0' }]} />
            <Text style={[s.onlineText, { color: c.is_online ? '#276749' : '#718096' }]}>
              {c.is_online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.consultantDetails}>
        <Text style={s.detailText}>🎓 {c.specialization}</Text>
        <Text style={s.detailText}>📍 {c.state}{c.district ? `, ${c.district}` : ''}</Text>
        <Text style={s.detailText}>💼 {c.experience_years || 0} years exp</Text>
        <Text style={s.detailText}>🗣 {c.languages || 'Hindi, English'}</Text>
        <Text style={s.detailText}>💰 {c.consultation_fee || 'Free'}</Text>
      </View>

      <View style={s.consultantActions}>
        {c.phone && (
          <TouchableOpacity style={s.phoneBtn} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
            <Text style={s.phoneBtnText}>📞 Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.videoBtn, !c.is_online && s.videoBtnDisabled]}
          onPress={() => c.is_online ? startVideoCall(c) : null}
          disabled={!c.is_online}
        >
          <Text style={[s.videoBtnText, !c.is_online && s.videoBtnTextDisabled]}>
            📹 Video Call
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>👨‍🌾 Experts & Consultants</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'consultants' && s.tabActive]}
          onPress={() => setActiveTab('consultants')}
        >
          <Text style={[s.tabText, activeTab === 'consultants' && s.tabTextActive]}>
            📹 Consultants ({consultants.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'officers' && s.tabActive]}
          onPress={() => setActiveTab('officers')}
        >
          <Text style={[s.tabText, activeTab === 'officers' && s.tabTextActive]}>
            🏛️ Officers ({officers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : activeTab === 'consultants' ? (
          consultants.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 56 }}>👨‍💻</Text>
              <Text style={s.emptyText}>No consultants registered yet</Text>
              <Text style={s.emptySubtext}>Consultants can register at the web portal</Text>
            </View>
          ) : consultants.map(renderConsultantCard)
        ) : (
          officers.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 56 }}>👮</Text>
              <Text style={s.emptyText}>No officers found</Text>
            </View>
          ) : officers.map(renderOfficerCard)
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  // Tabs
  tabs: {
    flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg,
    alignItems: 'center', backgroundColor: '#f7fafc', borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: '#f0fff4', borderColor: '#c6f6d5',
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#22543d', fontWeight: '700' },
  scroll: { padding: Spacing.xl },
  // Officer cards
  card: {
    backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.xl,
    marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  cardBody: { flex: 1 },
  name: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  role: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  spec: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  location: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  callBtn: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, marginTop: Spacing.sm,
  },
  callText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  // Consultant cards
  consultantCard: {
    backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.xl,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  consultantHeader: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  consultantAvatar: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#0f4c3a',
    alignItems: 'center', justifyContent: 'center',
  },
  consultantAvatarText: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  consultantInfo: { flex: 1 },
  consultantName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  consultantDesig: { fontSize: FontSize.sm, color: '#0f4c3a', fontWeight: '600', marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: Colors.border,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: FontSize.xs, fontWeight: '700' },
  consultantDetails: {
    backgroundColor: '#f7fafc', borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, gap: 4,
  },
  detailText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  consultantActions: { flexDirection: 'row', gap: Spacing.sm },
  phoneBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg,
    alignItems: 'center', backgroundColor: '#f7fafc',
    borderWidth: 1, borderColor: Colors.border,
  },
  phoneBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  videoBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg,
    alignItems: 'center', backgroundColor: '#0f4c3a',
  },
  videoBtnDisabled: { backgroundColor: '#e2e8f0' },
  videoBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
  videoBtnTextDisabled: { color: '#a0aec0' },
  // Empty states
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});

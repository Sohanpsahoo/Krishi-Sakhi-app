import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const sess = await storage.getSession();
    const prof = await storage.getProfile();
    if (prof) setProfile(prof);
    if (sess?.userId) {
      try {
        const res = await apiFetch(`/api/farmers/${sess.userId}/`);
        if (res.ok) { const d = await res.json(); setProfile(d); }
      } catch {}
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await storage.clearAll();
        router.replace('/');
      }},
    ]);
  };

  const fields = [
    { label: 'Phone', value: profile?.phone, icon: '📱' },
    { label: 'State', value: profile?.state, icon: '📍' },
    { label: 'District', value: profile?.district, icon: '🏘️' },
    { label: 'Experience', value: profile?.experience_years ? `${profile.experience_years} years` : null, icon: '⏳' },
    { label: 'Language', value: profile?.preferred_language || 'English', icon: '🌐' },
  ].filter(f => f.value);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#059669', '#047857']} style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(profile?.name || 'F').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{profile?.name || 'Farmer'}</Text>
          <Text style={s.sub}>Krishi Sakhi Member</Text>
        </LinearGradient>

        <View style={s.fieldsCard}>
          {fields.map((f, i) => (
            <View key={i} style={[s.fieldRow, i < fields.length - 1 && s.fieldBorder]}>
              <Text style={s.fieldIcon}>{f.icon}</Text>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldValue}>{f.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { position: 'absolute', top: 50, left: Spacing.xl, zIndex: 10 },
  back: { fontSize: FontSize.md, color: '#fff', fontWeight: '600' },
  scroll: {},
  hero: { alignItems: 'center', paddingTop: 100, paddingBottom: Spacing.xxxl, borderBottomLeftRadius: BorderRadius.xxl, borderBottomRightRadius: BorderRadius.xxl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  sub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  fieldsCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xxl, marginHorizontal: Spacing.xl, marginTop: -Spacing.xl, padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  fieldIcon: { fontSize: 22 },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginTop: 2 },
  logoutBtn: { marginHorizontal: Spacing.xl, marginTop: Spacing.xxl, backgroundColor: '#fef2f2', borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.red },
});

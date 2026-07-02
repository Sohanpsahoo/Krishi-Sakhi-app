import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';

export default function SchemesScreen() {
  const router = useRouter();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    try {
      const session = await storage.getSession();
      const profile = await storage.getProfile();
      const state = profile?.state || session?.state || 'Kerala';
      const res = await apiFetch(`/api/schemes/?state=${state}`);
      const data = await res.json();
      setSchemes(Array.isArray(data) ? data : (data.results || data.schemes || []));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>🏛️ Government Schemes</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} /> :
         schemes.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 56 }}>🏛️</Text><Text style={s.emptyText}>No schemes found</Text></View> :
         schemes.map((scheme, i) => (
          <View key={scheme._id || i} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.schemeIcon}>🏛️</Text>
              <View style={s.headerBody}>
                <Text style={s.schemeName}>{scheme.name || scheme.title || 'Scheme'}</Text>
                <Text style={s.schemeOrg}>{scheme.department || scheme.ministry || 'Government of India'}</Text>
              </View>
            </View>
            <Text style={s.schemeDesc}>{scheme.description || scheme.desc || 'No description available.'}</Text>
            {scheme.eligibility && <Text style={s.eligibility}>✅ {scheme.eligibility}</Text>}
            {scheme.benefits && <Text style={s.benefits}>💰 {scheme.benefits}</Text>}
            {scheme.url && (
              <TouchableOpacity style={s.linkBtn} onPress={() => Linking.openURL(scheme.url)}>
                <Text style={s.linkText}>Learn More →</Text>
              </TouchableOpacity>
            )}
          </View>
         ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  scroll: { padding: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: '600', marginTop: Spacing.md },
  card: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#e0e7ff' },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  schemeIcon: { fontSize: 32 },
  headerBody: { flex: 1 },
  schemeName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  schemeOrg: { fontSize: FontSize.xs, color: Colors.purple, fontWeight: '600', marginTop: 2 },
  schemeDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  eligibility: { fontSize: FontSize.sm, color: '#065f46', fontWeight: '600', marginBottom: 4 },
  benefits: { fontSize: FontSize.sm, color: '#92400e', fontWeight: '600', marginBottom: Spacing.md },
  linkBtn: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  linkText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.purple },
});

import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';
import { INDIAN_STATES } from '../constants/india-data';

// Dropdown picker component
function DropdownPicker({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.input, s.picker, disabled && s.pickerDisabled]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[s.pickerText, !value && s.pickerPlaceholder]}>
          {value || placeholder}
        </Text>
        <Text style={s.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={s.modalSearch}
              placeholder={`Search ${label.toLowerCase()}...`}
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            {/* Options */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.optionRow, item === value && s.optionRowActive]}
                  onPress={() => { onSelect(item); setVisible(false); setSearch(''); }}
                >
                  <Text style={[s.optionText, item === value && s.optionTextActive]}>
                    {item}
                  </Text>
                  {item === value && <Text style={s.optionCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={s.emptyText}>No results found</Text>
              }
              style={s.optionList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    state: 'Kerala',
    district: '',
    experience_years: 0,
    preferred_language: 'English',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const states = useMemo(() => Object.keys(INDIAN_STATES).sort(), []);
  const districts = useMemo(() => {
    if (!formData.state) return [];
    return (INDIAN_STATES as Record<string, string[]>)[formData.state]?.sort() || [];
  }, [formData.state]);

  const updateField = (key: string, val: any) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  const handleSignUp = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Name and Phone are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/farmers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          state: formData.state,
          district: formData.district,
          experience_years: formData.experience_years,
          preferred_language: formData.preferred_language,
        }),
      });

      if (res.ok || res.status === 201) {
        const farmer = await res.json();
        console.log('Farmer created:', farmer);

        const session = {
          userId: farmer._id || farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          state: farmer.state,
          district: farmer.district,
        };

        await storage.setSession(session);
        await storage.setProfile(farmer);

        Alert.alert('🎉 Account Created!', 'Welcome to Krishi Sakhi!', [
          { text: 'Start', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Unable to connect to server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f766e', '#059669', '#10b981']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Branding */}
          <View style={s.brand}>
            <View style={s.iconCircle}><Text style={{ fontSize: 36 }}>🌱</Text></View>
            <Text style={s.brandTitle}>Join Krishi Sakhi</Text>
            <Text style={s.brandSub}>Start your smart farming journey today</Text>
          </View>

          {/* Form Card */}
          <View style={s.card}>
            <View style={s.accentLine} />
            <Text style={s.cardTitle}>Create Account</Text>

            {/* Name */}
            <Text style={s.label}>FULL NAME</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textMuted}
              value={formData.name}
              onChangeText={v => updateField('name', v)}
            />

            {/* Phone */}
            <Text style={[s.label, { marginTop: Spacing.lg }]}>PHONE NUMBER</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={v => updateField('phone', v)}
            />

            {/* Email */}
            <Text style={[s.label, { marginTop: Spacing.lg }]}>EMAIL (OPTIONAL)</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your email address"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={v => updateField('email', v)}
            />

            {/* State Dropdown */}
            <View style={{ marginTop: Spacing.lg }}>
              <DropdownPicker
                label="STATE"
                value={formData.state}
                options={states}
                placeholder="Select State"
                onSelect={v => setFormData(prev => ({ ...prev, state: v, district: '' }))}
              />
            </View>

            {/* District Dropdown */}
            <View style={{ marginTop: Spacing.lg }}>
              <DropdownPicker
                label="DISTRICT"
                value={formData.district}
                options={districts}
                placeholder="Select District"
                onSelect={v => updateField('district', v)}
                disabled={!formData.state}
              />
            </View>

            {/* Experience */}
            <Text style={[s.label, { marginTop: Spacing.lg }]}>EXPERIENCE (YEARS)</Text>
            <TextInput
              style={s.input}
              placeholder="Years of farming experience"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={formData.experience_years.toString()}
              onChangeText={v => updateField('experience_years', parseInt(v) || 0)}
            />

            {/* Language */}
            <View style={{ marginTop: Spacing.lg }}>
              <DropdownPicker
                label="PREFERRED LANGUAGE"
                value={formData.preferred_language}
                options={['English', 'Malayalam']}
                placeholder="Select Language"
                onSelect={v => updateField('preferred_language', v)}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={s.errorCard}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.submitText}>  Creating Account...</Text>
                </View>
              ) : (
                <Text style={s.submitText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={s.loginLink}>
                Already have an account?{' '}
                <Text style={{ color: '#059669', fontWeight: '700' }}>Sign in here</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 80,
    paddingBottom: 40,
  },
  back: { position: 'absolute', top: 60, left: Spacing.xxl, zIndex: 9 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.md, fontWeight: '600' },

  brand: { alignItems: 'center', marginBottom: Spacing.xxl },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.md,
  },
  brandTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff', textAlign: 'center' },
  brandSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 4, backgroundColor: '#059669',
  },
  cardTitle: {
    fontSize: FontSize.xl, fontWeight: '800', color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.xxl,
  },

  label: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: Spacing.sm, letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
  },

  // Picker (dropdown look)
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerDisabled: { backgroundColor: '#f1f5f9', opacity: 0.6 },
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
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 20, color: Colors.textMuted, fontWeight: '700', padding: 8 },
  modalSearch: {
    marginHorizontal: Spacing.xxl,
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  optionList: { paddingHorizontal: Spacing.xl },
  optionRow: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRowActive: { backgroundColor: Colors.primaryBg },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: '700' },
  optionCheck: { fontSize: 16, color: Colors.primary, fontWeight: '800' },
  emptyText: {
    textAlign: 'center', padding: Spacing.xxl,
    color: Colors.textMuted, fontSize: FontSize.md,
  },

  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontWeight: '600', fontSize: FontSize.sm },

  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xl },
  loginLink: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textSecondary },
});

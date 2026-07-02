import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with phone:', phone.trim());

      const res = await apiFetch('/api/farmers/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      if (res.ok) {
        const farmer = await res.json();
        console.log('Login successful:', farmer.name);

        const session = {
          userId: farmer._id || farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          state: farmer.state,
          district: farmer.district,
        };

        await storage.setSession(session);
        await storage.setProfile(farmer);
        await storage.setLanguage(farmer.preferred_language || 'English');

        router.replace('/(tabs)');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Phone number not registered. Please sign up first.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please check if the backend is running and both devices are on the same WiFi network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f766e', '#059669', '#10b981']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Branding */}
          <View style={styles.brandWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🌾</Text>
            </View>
            <Text style={styles.title}>Krishi Sakhi</Text>
            <Text style={styles.subtitle}>Your Intelligent Farming Companion</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Accent line */}
            <View style={styles.accentLine} />

            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue your farming journey</Text>

            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your registered phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => { setPhone(v); setError(''); }}
              autoFocus
            />

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.loginBtnText}>  Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>
                New to Krishi Sakhi?{' '}
                <Text style={styles.signupBold}>Create your account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 40,
  },
  back: { position: 'absolute', top: 60, left: 0, zIndex: 9 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.md, fontWeight: '600' },

  brandWrap: { alignItems: 'center', marginBottom: Spacing.xxl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.lg,
  },
  iconEmoji: { fontSize: 40 },
  title: {
    fontSize: FontSize.xxxl, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', fontWeight: '300',
  },

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
    height: 4,
    backgroundColor: '#059669',
  },
  cardTitle: {
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    marginBottom: Spacing.xs, textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: FontSize.md, color: Colors.textSecondary,
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
    paddingVertical: Spacing.lg,
    fontSize: FontSize.lg,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
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

  loginBtn: {
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
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xl },
  signupLink: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textSecondary },
  signupBold: { color: '#059669', fontWeight: '700' },
});

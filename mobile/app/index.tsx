import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';

const { width } = Dimensions.get('window');
const LOGO_URL =
  'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

const FEATURES = [
  { icon: '🌱', title: 'Disease Detection', desc: 'Instant crop diagnosis' },
  { icon: '☀️', title: 'Weather Alerts', desc: '7-day forecasts' },
  { icon: '💰', title: 'Market Prices', desc: 'Live crop rates' },
  { icon: '🤖', title: 'AI Assistant', desc: '24/7 farming help' },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#064e3b', '#065f46', '#047857']} style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.circle, { top: -60, right: -40, opacity: 0.08 }]} />
      <View style={[styles.circle, { bottom: 120, left: -60, opacity: 0.06, width: 200, height: 200 }]} />

      {/* Logo */}
      <View style={styles.logoWrap}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} />
      </View>

      {/* Title */}
      <Text style={styles.title}>
        Welcome to{'\n'}
        <Text style={styles.titleAccent}>Krishi Sakhi</Text>
      </Text>
      <Text style={styles.subtitle}>Your Farming Companion</Text>
      <Text style={styles.desc}>
        Smart, simple, and supportive tools for every farmer.
      </Text>

      {/* Feature cards */}
      <View style={styles.featureGrid}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.85}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.btnPrimaryText}>↪ Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.85}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.btnSecondaryText}>✚ Sign Up</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© 2026 Krishi Sakhi. Built for the heart of farming.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#fff',
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#6ee7b7',
  },
  subtitle: {
    fontSize: FontSize.xl,
    color: '#a7f3d0',
    fontWeight: '300',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  desc: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    maxWidth: 280,
    lineHeight: 22,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  featureCard: {
    width: (width - 80) / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#a7f3d0',
    marginBottom: 2,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnPrimaryText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnSecondaryText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

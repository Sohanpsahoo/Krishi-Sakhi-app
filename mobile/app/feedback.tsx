import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { apiFetch } from '../services/api';
import { storage } from '../services/storage';

export default function FeedbackScreen() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!rating) return Alert.alert('Please rate', 'Tap a star to rate your experience');
    try {
      const session = await storage.getSession();
      await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[FEEDBACK] Rating: ${rating}/5. Comment: ${feedback || 'No comment'}`,
          farmer_id: session?.userId,
          language: 'english',
        }),
      });
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback');
    }
  };

  if (submitted) {
    return (
      <View style={s.root}>
        <View style={s.center}>
          <Text style={{ fontSize: 64 }}>🙏</Text>
          <Text style={s.thankTitle}>Thank You!</Text>
          <Text style={s.thankSub}>Your feedback helps us improve Krishi Sakhi.</Text>
          <TouchableOpacity style={s.homeBtn} onPress={() => router.back()}>
            <Text style={s.homeBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>⭐ Feedback</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.question}>How was your experience?</Text>
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={[s.star, n <= rating && s.starActive]}>{n <= rating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.ratingLabel}>{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating] || 'Tap to rate'}</Text>

          <Text style={s.label}>Your Comments (Optional)</Text>
          <TextInput
            style={s.textarea}
            placeholder="Tell us what you think..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={5}
            value={feedback}
            onChangeText={setFeedback}
            textAlignVertical="top"
          />

          <TouchableOpacity style={s.submitBtn} onPress={submit}>
            <Text style={s.submitText}>Submit Feedback →</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  header: { paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  scroll: { padding: Spacing.xl },
  card: { backgroundColor: '#fff', borderRadius: BorderRadius.xxl, padding: Spacing.xxl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  question: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.xxl },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  star: { fontSize: 40, color: Colors.textMuted },
  starActive: { color: '#f59e0b' },
  ratingLabel: { textAlign: 'center', fontSize: FontSize.md, fontWeight: '600', color: Colors.primary, marginBottom: Spacing.xxl },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  textarea: { backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.lg, fontSize: FontSize.md, color: Colors.text, minHeight: 120, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xxl },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FontSize.lg },
  thankTitle: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg },
  thankSub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  homeBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, marginTop: Spacing.xxl },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});

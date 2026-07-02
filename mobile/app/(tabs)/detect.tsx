import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';

export default function DetectScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert('Permission Required', `Please grant ${useCamera ? 'camera' : 'photo library'} access.`);
        return;
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.4,
        base64: false,
        allowsEditing: true,
        aspect: [1, 1],
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);

      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
        setResult(null);
        setError(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const analyzeDisease = async () => {
    if (!imageUri) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      // Build FormData from the image URI
      const formData = new FormData();
      const fileName = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type,
      } as any);

      const response = await apiFetch('/api/disease/detect', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status}`);
      }

      const data = await response.json();
      const detectionSource = data.detection_source || 'kindwise';

      if (data.result) {
        const plantInfo = data.result.plant_identification;

        if (!data.result.is_healthy && data.result.disease?.suggestions?.length > 0) {
          const topDisease = data.result.disease.suggestions[0];
          setResult({
            diseaseName: topDisease.name,
            probability: Math.round(topDisease.probability * 100),
            description: topDisease.description || 'No description available',
            treatment: topDisease.treatment || 'Please consult an expert.',
            nextSteps: topDisease.next_steps || null,
            isHealthy: false,
            detectionSource,
            plantInfo: plantInfo ? {
              scientificName: plantInfo.scientific_name,
              probability: Math.round(plantInfo.probability * 100),
            } : null,
          });
        } else {
          setResult({
            isHealthy: true,
            message: 'Your crop appears to be healthy! No diseases detected.',
            healthyAdvice: data.result.ai_healthy_advice || null,
            detectionSource,
            plantInfo: plantInfo ? {
              scientificName: plantInfo.scientific_name,
              probability: Math.round(plantInfo.probability * 100),
            } : null,
          });
        }
      } else {
        setResult({
          isHealthy: true,
          message: 'No diseases detected. Your crop appears to be healthy!',
        });
      }
    } catch (err: any) {
      console.error('Disease detection error:', err);
      setError('Failed to analyze the image. Please try again with a clearer photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDetection = () => {
    setImageUri(null);
    setResult(null);
    setError(null);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: Colors.text, fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🔬 Disease Detection</Text>
          </View>
          <Text style={styles.subtitle}>Capture or upload a crop photo to detect diseases</Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={styles.errorClose}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload / Camera Area */}
        {!imageUri && !result && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconWrap}>
              <Text style={styles.uploadIconText}>📸</Text>
            </View>
            <Text style={styles.uploadTitle}>Scan Your Crop</Text>
            <Text style={styles.uploadDesc}>Take a photo or choose from gallery</Text>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cameraBtn}
                activeOpacity={0.8}
                onPress={() => pickImage(true)}
              >
                <Text style={styles.cameraBtnText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.galleryBtn}
                activeOpacity={0.8}
                onPress={() => pickImage(false)}
              >
                <Text style={styles.galleryBtnText}>📁 Gallery</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.uploadNote}>Supported: JPG, PNG • Max: 5MB</Text>
          </View>
        )}

        {/* Preview */}
        {imageUri && !result && (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.analyzeBtn, isProcessing && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={analyzeDisease}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.processingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.analyzeBtnText}> Analyzing...</Text>
                  </View>
                ) : (
                  <Text style={styles.analyzeBtnText}>🔬 Analyze Photo</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={resetDetection}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultContainer}>
            {/* Detection source badge */}
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {result.detectionSource === 'cnn_model' ? '🤖 AI Model' :
                 result.detectionSource === 'kindwise' ? '🔬 KindWise' : '🧠 Gemini'}
              </Text>
            </View>

            {/* Status header */}
            <LinearGradient
              colors={result.isHealthy ? ['#ecfdf5', '#d1fae5'] : ['#fef2f2', '#fee2e2']}
              style={styles.resultHeader}
            >
              <Text style={styles.resultHeaderEmoji}>
                {result.isHealthy ? '✅' : '🦠'}
              </Text>
              <Text style={[styles.resultHeaderTitle, { color: result.isHealthy ? '#065f46' : '#991b1b' }]}>
                {result.isHealthy ? 'Healthy Plant' : 'Disease Detected'}
              </Text>
              {result.probability && (
                <View style={[styles.confBadge, { backgroundColor: result.isHealthy ? '#d1fae5' : '#fee2e2' }]}>
                  <Text style={{ color: result.isHealthy ? '#059669' : '#dc2626', fontWeight: '800', fontSize: 12 }}>
                    {result.probability}% confidence
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Plant Info */}
            {result.plantInfo && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>🌱 Plant Identification</Text>
                <Text style={styles.infoValue}>{result.plantInfo.scientificName}</Text>
              </View>
            )}

            {/* Disease details or healthy message */}
            {result.isHealthy ? (
              <View style={styles.healthyCard}>
                <Text style={styles.healthyEmoji}>✨</Text>
                <Text style={styles.healthyText}>{result.message}</Text>
                {result.healthyAdvice && (
                  <View style={styles.adviceCard}>
                    <Text style={styles.adviceTitle}>🌱 Expert AI Care Tips</Text>
                    <Text style={styles.adviceText}>{result.healthyAdvice}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Disease name & description */}
                <View style={styles.diseaseCard}>
                  <Text style={styles.diseaseLabel}>DISEASE DETECTED</Text>
                  <Text style={styles.diseaseName}>{result.diseaseName}</Text>
                  {result.description && (
                    <Text style={styles.diseaseDesc}>{result.description}</Text>
                  )}
                </View>

                {/* Treatment */}
                {result.treatment && (
                  <View style={[styles.infoCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <Text style={[styles.infoLabel, { color: '#1e40af' }]}>💊 Recommended Treatment</Text>
                    <Text style={[styles.infoValue, { color: '#1e3a5f' }]}>{result.treatment}</Text>
                  </View>
                )}

                {/* Next Steps */}
                {result.nextSteps && (
                  <View style={[styles.infoCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                    <Text style={[styles.infoLabel, { color: '#92400e' }]}>🚨 Immediate Next Steps</Text>
                    <Text style={[styles.infoValue, { color: '#78350f' }]}>{result.nextSteps}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              ⚠ Disclaimer: This is an AI-based detection system. For accurate diagnosis, please consult a qualified agricultural expert.
            </Text>

            {/* Scan Again */}
            <TouchableOpacity style={styles.scanAgainBtn} onPress={resetDetection}>
              <Text style={styles.scanAgainText}>📷 Scan Another Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingTop: 60, paddingHorizontal: Spacing.xl },
  header: { marginBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, color: '#991b1b', fontWeight: '600', fontSize: FontSize.sm },
  errorClose: { fontSize: 24, color: '#dc2626', fontWeight: '700', paddingLeft: 12 },

  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  uploadIconText: { fontSize: 36 },
  uploadTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  uploadDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  cameraBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  galleryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  galleryBtnText: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  uploadNote: { fontSize: FontSize.xs, color: Colors.textMuted },

  previewCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  previewImg: { width: '100%', height: 300, resizeMode: 'cover' },
  previewActions: { padding: Spacing.xl, gap: Spacing.md },
  analyzeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.lg },
  processingRow: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  removeBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.md },

  resultContainer: { gap: Spacing.lg },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sourceBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: '#7c3aed' },

  resultHeader: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultHeaderEmoji: { fontSize: 48 },
  resultHeaderTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  confBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },

  infoCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoLabel: { fontSize: FontSize.sm, fontWeight: '700', color: '#065f46', marginBottom: Spacing.sm },
  infoValue: { fontSize: FontSize.md, color: '#064e3b', lineHeight: 22 },

  healthyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  healthyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  healthyText: { fontSize: FontSize.lg, fontWeight: '700', color: '#065f46', textAlign: 'center', lineHeight: 26 },
  adviceCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  adviceTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#065f46', marginBottom: Spacing.sm },
  adviceText: { fontSize: FontSize.sm, color: '#064e3b', lineHeight: 20 },

  diseaseCard: {
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  diseaseLabel: { fontSize: FontSize.xs, fontWeight: '700', color: '#dc2626', letterSpacing: 1.5, marginBottom: 4 },
  diseaseName: { fontSize: FontSize.xxl, fontWeight: '900', color: '#7f1d1d', marginBottom: Spacing.md },
  diseaseDesc: { fontSize: FontSize.sm, color: '#991b1b', lineHeight: 20 },

  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },

  scanAgainBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  scanAgainText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});

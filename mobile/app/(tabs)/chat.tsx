import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Animated, Easing, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'welcome' | 'advice' | 'fallback';
  cards?: any[] | null;
}

const SUGGESTIONS = [
  'What fertilizer should I use for my crop?',
  'Show me a crop calendar',
  'How to improve soil health?',
  'What government schemes can I apply for?',
  'Tips for pest management',
  'Current weather advice for my farm',
];

export default function ChatScreen() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // ── Voice recording (expo-audio hook) ──
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRecording = recorderState.isRecording;

  // Initialize session & welcome message
  useEffect(() => {
    (async () => {
      const sess = await storage.getSession();
      setSession(sess);
      const name = sess?.name || '';
      setMessages([{
        id: '0',
        text: `Namaste${name ? `, ${name}` : ''}! 🙏\n\nI'm **Krishi Sakhi** — your intelligent farming companion powered by AI.\n\nI have access to your **farm data**, **crop recommendations**, **soil analysis**, **government schemes**, **market prices**, and **local agricultural officers**.\n\n🌾 Ask me about fertilizers, crop care, weather, pests, or market prices!\n\n🎤 You can also use **voice input** in any Indian language — I'll understand and respond!`,
        isUser: false,
        timestamp: new Date(),
        type: 'welcome',
      }]);
    })();
  }, []);

  // Pulse animation for recording
  useEffect(() => {
    if (recorderState.isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recorderState.isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  // ── Voice Recording Functions ──────────────────────────────────────

  const startRecording = async () => {
    try {
      // Request permission
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Please allow microphone access in your device settings to use voice input.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording using the hook-managed recorder
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingDuration(0);

      // Duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop after 30 seconds (Sarvam API limit)
      autoStopTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not start voice recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    // Clear timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    try {
      setIsTranslatingVoice(true);

      // Stop the recording
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        throw new Error('No audio file created');
      }

      // Skip very short recordings (less than 1 second)
      if (recordingDuration < 1) {
        setIsTranslatingVoice(false);
        return;
      }

      // Read file as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });

      console.log(`🎤 Voice recording: ${recordingDuration}s, base64 length: ${base64Audio.length}`);

      // Send to backend for STT translation
      const response = await apiFetch('/api/sarvam/stt-translate-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64Audio,
          mime_type: 'audio/m4a',
        }),
      });

      const data = await response.json();

      if (data.success && data.translated_text) {
        // Set translated text in input
        const translatedText = data.translated_text.trim();
        if (translatedText) {
          setInput(translatedText);
          console.log(`✅ Voice → English: "${translatedText}"`);
        } else {
          Alert.alert('No Speech Detected', 'Could not detect any speech. Please try again and speak clearly.');
        }
      } else {
        console.warn('STT response:', data);
        Alert.alert('Translation Failed', data.message || 'Could not translate voice. Please try again.');
      }

      // Clean up the audio file
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}

    } catch (err: any) {
      console.error('Voice processing error:', err);
      Alert.alert('Voice Error', 'Failed to process voice recording. Please try typing instead.');
    } finally {
      setIsTranslatingVoice(false);
      // Reset audio mode
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: false,
        });
      } catch {}
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Send a message ──
  const sendMessage = useCallback(async (overrideMsg?: string) => {
    const text = overrideMsg || input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    // Build conversation history for context
    const history = messages
      .slice(-10)
      .filter(m => m.type !== 'welcome')
      .map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        text: m.text || '',
      }));

    try {
      const sess = session || await storage.getSession();
      const res = await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: 'English',
          farmer_id: sess?.userId,
          conversation_history: history,
        }),
      });

      const raw = await res.text();
      if (!raw) throw new Error('Empty response');
      const data = JSON.parse(raw);

      // Build cards
      let responseCards = data.cards || [];
      if (data.activityLogged && data.loggedActivityData) {
        responseCards = [...responseCards, {
          type: 'activity_logged',
          title: 'Activity Logged!',
          icon: '✅',
          data: {
            Type: data.loggedActivityData.activity_type,
            Note: data.loggedActivityData.text_note,
            Date: new Date(data.loggedActivityData.date).toLocaleDateString(),
          },
        }];
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'I could not generate a response.',
        isUser: false,
        timestamp: new Date(),
        type: data.is_fallback ? 'fallback' : 'advice',
        cards: responseCards.length > 0 ? responseCards : null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I'm your **Krishi Sakhi** assistant! I'm having trouble connecting right now. Please check your connection and try again. 🌾",
        isUser: false,
        timestamp: new Date(),
        type: 'fallback',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, session]);

  const clearChat = () => {
    const name = session?.name || '';
    setMessages([{
      id: Date.now().toString(),
      text: `Chat cleared! 🧹\n\nNamaste${name ? `, ${name}` : ''}! I'm **Krishi Sakhi** — ready to help with your farming questions.\n\n🌾 Ask me anything!`,
      isUser: false,
      timestamp: new Date(),
      type: 'welcome',
    }]);
    setShowSuggestions(true);
  };

  // ── Render markdown-like text ──
  const renderFormattedText = (text: string, isUser: boolean) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (/^#{1,3}\s/.test(line)) {
        const headerText = line.replace(/^#{1,3}\s/, '');
        return (
          <Text key={i} style={[st.msgHeader, isUser && { color: '#fff' }]}>
            {headerText}
          </Text>
        );
      }

      // Bullet points
      if (/^[\-•▸]\s/.test(line.trim())) {
        const bulletText = line.replace(/^[\s]*[\-•▸]\s*/, '');
        return (
          <View key={i} style={st.bulletRow}>
            <Text style={[st.bulletDot, isUser && { color: 'rgba(255,255,255,0.7)' }]}>▸</Text>
            <Text style={[st.msgText, isUser && st.msgTextUser]}>{renderBold(bulletText, isUser)}</Text>
          </View>
        );
      }

      // Numbered lists
      if (/^\d+[.)]\s/.test(line.trim())) {
        const match = line.match(/^[\s]*(\d+)[.)]\s*(.*)/);
        if (match) {
          return (
            <View key={i} style={st.bulletRow}>
              <View style={st.numBadge}>
                <Text style={st.numText}>{match[1]}</Text>
              </View>
              <Text style={[st.msgText, isUser && st.msgTextUser]}>{renderBold(match[2], isUser)}</Text>
            </View>
          );
        }
      }

      // Empty line
      if (!line.trim()) return <View key={i} style={{ height: 8 }} />;

      // Regular line
      return (
        <Text key={i} style={[st.msgText, isUser && st.msgTextUser]}>
          {renderBold(line, isUser)}
        </Text>
      );
    });
  };

  const renderBold = (text: string, isUser: boolean) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={j} style={[st.boldText, isUser && { color: '#fff' }]}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={j}>{part}</Text>;
    });
  };

  // ── Render info cards ──
  const renderCard = (card: any, index: number) => {
    if (!card) return null;
    return (
      <View key={index} style={st.infoCard}>
        <Text style={st.infoCardTitle}>{card.icon} {card.title}</Text>
        {card.data && Object.entries(card.data).map(([k, v]) => (
          <View key={k} style={st.infoCardRow}>
            <Text style={st.infoCardKey}>{k}</Text>
            <Text style={st.infoCardValue}>{String(v)}</Text>
          </View>
        ))}
        {card.items && card.items.map((item: string, i: number) => (
          <Text key={i} style={st.infoCardItem}>✓ {item}</Text>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[st.msgRow, item.isUser && st.msgRowUser]}>
      <View style={{ maxWidth: '85%' }}>
        <View style={[st.bubble, item.isUser ? st.bubbleUser : st.bubbleBot]}>
          {renderFormattedText(item.text, item.isUser)}
        </View>

        {/* Info cards */}
        {item.cards && item.cards.map((card, ci) => renderCard(card, ci))}

        {/* Timestamp */}
        <Text style={[st.timestamp, item.isUser ? { textAlign: 'right', color: '#059669' } : { textAlign: 'left' }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={st.rootWrapper}>
      <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <Text style={{ fontSize: 24, color: '#111827', fontWeight: '600' }}>←</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Botanical Chat</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={st.clearBtn} onPress={clearChat}>
            <Text style={st.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={st.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {loading && (
          <View style={st.typingRow}>
            <View style={st.typingBubble}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={st.typingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Bottom Area */}
        <View style={st.bottomContainer}>
          {/* Suggestions */}
          {showSuggestions && messages.length <= 2 && (
            <View style={st.suggestionsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {SUGGESTIONS.map((item, i) => (
                  <TouchableOpacity key={i} style={st.suggestBtn} onPress={() => sendMessage(item)}>
                    <Text style={st.suggestText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recording & Translating Indicators */}
          {isRecording && (
            <View style={st.recordingIndicatorContainer}>
               <View style={st.recordingDot} />
               <Text style={st.recordingText}>Recording {formatDuration(recordingDuration)}</Text>
               <TouchableOpacity onPress={stopRecording} style={st.recordingStopBtn}>
                 <Text style={st.recordingStopText}>Stop</Text>
               </TouchableOpacity>
            </View>
          )}
          
          {isTranslatingVoice && (
             <View style={st.recordingIndicatorContainer}>
               <ActivityIndicator size="small" color="#059669" />
               <Text style={[st.recordingText, {color: '#059669', marginLeft: 8}]}>Translating voice...</Text>
             </View>
          )}

          {/* Smooth Input Bar (ChatGPT Style) */}
          <View style={st.inputBar}>
            <TextInput
              style={st.input}
              placeholder="Message Krishi Sakhi..."
              placeholderTextColor="#9ca3af"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />

            {(input.trim() || loading) ? (
              <TouchableOpacity
                style={[st.sendBtn, (!input.trim() || loading) && { backgroundColor: '#e5e7eb' }]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || loading}
              >
                <Text style={[st.sendIcon, (!input.trim() || loading) && { color: '#9ca3af' }]}>↑</Text>
              </TouchableOpacity>
            ) : (
              <Animated.View style={{ transform: [{ scale: (isRecording || isTranslatingVoice) ? pulseAnim : 1 }] }}>
                <TouchableOpacity
                  style={st.micBtn}
                  onPress={toggleRecording}
                  disabled={isTranslatingVoice || loading}
                >
                  <Text style={st.micIcon}>
                    {isTranslatingVoice ? '⏳' : isRecording ? '⏹' : '🎤'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  rootWrapper: { flex: 1, backgroundColor: '#ffffff' },
  root: { flex: 1 },

  // Header (Sleek minimalist style)
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  clearBtn: { backgroundColor: '#f4f4f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },

  // Messages
  msgList: { padding: 16, paddingBottom: 24 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 },
  msgRowUser: { justifyContent: 'flex-end' },

  bubble: { borderRadius: 20, padding: 16 },
  bubbleBot: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },

  msgText: { fontSize: 16, lineHeight: 24, color: '#1f2937' },
  msgTextUser: { color: '#ffffff' },
  boldText: { fontWeight: '700' },
  msgHeader: { fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 4, color: '#047857' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 },
  bulletDot: { color: '#059669', fontWeight: '800', fontSize: 16, marginRight: 8, marginTop: 2 },
  numBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginTop: 2, marginRight: 8 },
  numText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  timestamp: { fontSize: 11, color: '#9ca3af', marginTop: 8, fontWeight: '500', paddingHorizontal: 4 },

  // Info cards
  infoCard: {
    borderRadius: 16, backgroundColor: '#ffffff', padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  infoCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, color: '#111827' },
  infoCardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
  },
  infoCardKey: { fontSize: 13, color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' },
  infoCardValue: { fontSize: 13, color: '#111827', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  infoCardItem: { fontSize: 13, fontWeight: '500', marginTop: 6, lineHeight: 18, color: '#4b5563' },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, paddingHorizontal: 16 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6',
    borderRadius: 20, borderBottomLeftRadius: 4, paddingVertical: 12, paddingHorizontal: 16, gap: 10,
  },
  typingText: { fontSize: 15, color: '#4b5563', fontWeight: '500' },

  // Bottom Container
  bottomContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5'
  },
  
  // Suggestions
  suggestionsWrap: {
    marginBottom: 12,
    height: 40,
  },
  suggestBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // Recording status
  recordingIndicatorContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginBottom: 12,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 10 },
  recordingText: { flex: 1, fontSize: 14, color: '#dc2626', fontWeight: '600' },
  recordingStopBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  recordingStopText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Input bar (ChatGPT Style)
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 120,
    fontWeight: '400',
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
    marginRight: 12,
  },

  // Buttons
  micBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  micIcon: { fontSize: 18 },

  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: { fontSize: 18, color: '#ffffff', fontWeight: '800' },
});

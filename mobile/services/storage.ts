import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SESSION: 'ammachi_session',
  PROFILE: 'ammachi_profile',
  LANGUAGE: 'ammachi_language',
};

export const storage = {
  // Session
  async getSession() {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async setSession(data: any) {
    await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify(data));
  },
  async clearSession() {
    await AsyncStorage.removeItem(KEYS.SESSION);
  },

  // Profile
  async getProfile() {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PROFILE);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async setProfile(data: any) {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
  },
  async clearProfile() {
    await AsyncStorage.removeItem(KEYS.PROFILE);
  },

  // Language
  async getLanguage(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(KEYS.LANGUAGE)) || 'English';
    } catch { return 'English'; }
  },
  async setLanguage(lang: string) {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  },

  // Clear all
  async clearAll() {
    await AsyncStorage.removeItem(KEYS.SESSION);
    await AsyncStorage.removeItem(KEYS.PROFILE);
    await AsyncStorage.removeItem(KEYS.LANGUAGE);
  },
};

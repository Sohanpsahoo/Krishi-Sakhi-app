import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, FlatList, Platform, StatusBar, Linking,
  KeyboardAvoidingView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, BorderRadius, Spacing } from '../../constants/Theme';
import { apiFetch } from '../../services/api';
import { storage } from '../../services/storage';
import { INDIAN_STATES } from '../../constants/india-data';

const STATUSBAR_H = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10;

const SPEC_ICONS: any = {
  'Crop': '🌾', 'Soil': '🪨', 'Plant Protection': '🛡', 'Pest': '🛡',
  'Horticulture': '🍎', 'Organic': '🌱', 'Water': '💧', 'Irrigation': '💧',
  'Post-Harvest': '📦', 'Marketing': '📈', 'Mechanization': '🚜', 'Farm Mech': '🚜',
  'Seed': '🌱', 'Rice': '🌾', 'Spice': '🌶', 'Dairy': '🐄', 'Fishery': '🐟',
  'Entomology': '🐛', 'Extension': '📢', 'Genetics': '🧬', 'Agronomy': '🌾',
  'Pathology': '🔬', 'Breeding': '🧬', 'Biotechnology': '🧪',
};

const GRADIENTS: readonly [string, string][] = [
  ['#10b981', '#14b8a6'], // emerald to teal
  ['#3b82f6', '#6366f1'], // blue to indigo
  ['#a855f7', '#ec4899'], // purple to pink
  ['#f59e0b', '#f97316'], // amber to orange
  ['#06b6d4', '#3b82f6'], // cyan to blue
  ['#f43f5e', '#ef4444'], // rose to red
  ['#6366f1', '#8b5cf6'], // indigo to violet
] as const;

export default function OfficersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('officers');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States
  const [officers, setOfficers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [helplines, setHelplines] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);

  // Loading flags
  const [loading, setLoading] = useState(false);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const [helplinesLoading, setHelplinesLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Location
  const [selectedState, setSelectedState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Booking Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [consultForm, setConsultForm] = useState({
    subject: '',
    description: '',
    consultation_type: 'phone',
    preferred_date: '',
    preferred_time: '10:00',
    farmer_phone: '',
    farmer_location: ''
  });

  const states = useMemo(() => Object.keys(INDIAN_STATES).sort(), []);

  useEffect(() => {
    (async () => {
      try {
        const session = await storage.getSession();
        const profile = await storage.getProfile();
        setCurrentUser(session);
        const st = profile?.state || session?.state || 'Kerala';
        setSelectedState(st);
      } catch (e) {
        setSelectedState('Kerala');
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedState) {
      if (activeTab === 'officers') fetchAIExperts();
      if (activeTab === 'consultants') fetchConsultants();
      if (activeTab === 'helplines') fetchHelplines();
    }
  }, [selectedState]);

  const fetchAIExperts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/officers/ai-experts?state=${encodeURIComponent(selectedState)}`);
      const data = await res.json();
      if (data.success) setOfficers(data.data || []);
      else setOfficers([]);
    } catch (err) {
      console.warn('Failed to fetch experts:', err);
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultants = async () => {
    setConsultantsLoading(true);
    try {
      const res = await apiFetch(`/api/consultants/?state=${encodeURIComponent(selectedState)}`);
      const data = await res.json();
      setConsultants(data.data || []);
    } catch (err) {
      console.warn('Failed to fetch consultants:', err);
      setConsultants([]);
    } finally {
      setConsultantsLoading(false);
    }
  };

  const startVideoCall = async (consultant: any) => {
    const roomId = `call_${consultant._id}_${Date.now()}`;
    
    // Notify backend so consultant dashboard can see the incoming call
    try {
      await apiFetch('/api/call-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          consultantId: consultant._id,
          farmerName: currentUser?.name || 'A Farmer',
        }),
      });
    } catch (err) {
      console.warn('Failed to create call request:', err);
    }

    router.push({
      pathname: '/video-call',
      params: {
        roomId,
        consultantName: consultant.name,
        consultantId: consultant._id,
      },
    } as any);
  };

  const fetchHelplines = async () => {
    setHelplinesLoading(true);
    try {
      const res = await apiFetch(`/api/officers/helplines?state=${encodeURIComponent(selectedState)}`);
      const data = await res.json();
      if (data.success) setHelplines(data.data);
    } catch (err) {
      console.warn('Failed to fetch helplines:', err);
    } finally {
      setHelplinesLoading(false);
    }
  };

  const fetchConsultations = async () => {
    if (!currentUser?.userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/officers/consultations/list?farmer_id=${currentUser.userId}`);
      const data = await res.json();
      if (data.success) setConsultations(data.data || []);
    } catch (err) {
      console.warn('Failed to fetch consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (activeTab === 'officers') await fetchAIExperts();
    if (activeTab === 'consultants') await fetchConsultants();
    if (activeTab === 'helplines') await fetchHelplines();
    if (activeTab === 'bookings') await fetchConsultations();
  };

  const openConsultation = (off: any) => {
    if (!currentUser?.userId) {
      Alert.alert('Login Required', 'You must log in to book an expert.');
      return;
    }
    setSelectedOfficer(off);
    setConsultForm({
      subject: '',
      description: '',
      consultation_type: 'phone',
      preferred_date: new Date().toISOString().split('T')[0],
      preferred_time: '14:00',
      farmer_phone: currentUser?.phone || '',
      farmer_location: `${currentUser?.district || ''}, ${currentUser?.state || selectedState}`
    });
    setShowModal(true);
  };

  const submitConsultation = async () => {
    if (!currentUser?.userId || !selectedOfficer) return;
    if (!consultForm.subject || !consultForm.preferred_date || !consultForm.farmer_phone) {
      Alert.alert('Missing Fields', 'Please complete Subject, Date, and Phone Number.');
      return;
    }

    setBooking(true);
    try {
      let officerId = selectedOfficer._id || selectedOfficer.id;
      
      // Save AI Expert to DB if not saved
      if (typeof officerId === 'string' && (officerId.startsWith('ai_') || officerId.startsWith('fb_'))) {
        const saveRes = await apiFetch('/api/officers/ai-experts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedOfficer)
        });
        const saveData = await saveRes.json();
        if (saveData.success && saveData.data?._id) {
          officerId = saveData.data._id;
        } else {
          Alert.alert('Error', 'Failed to register expert. Please try again.');
          return;
        }
      }

      // Book call
      const res = await apiFetch('/api/officers/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: currentUser.userId,
          officer: officerId,
          ...consultForm
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Alert.alert('Success!', `Consultation booked successfully with ${selectedOfficer.name}!`);
        setShowModal(false);
        setActiveTab('bookings');
        fetchConsultations();
      } else {
        Alert.alert('Error', data.message || 'Failed to book consultation.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to communicate with the server.');
    } finally {
      setBooking(false);
    }
  };

  const cancelConsultation = async (id: string) => {
    Alert.alert(
      "Cancel Consultation",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/officers/consultations/${id}/cancel`, { method: 'PATCH' });
              setConsultations(prev => prev.map(c => (c._id || c.id) === id ? { ...c, status: 'cancelled' } : c));
            } catch (err) {
              Alert.alert('Error', 'Could not cancel consultation.');
            }
          }
        }
      ]
    );
  };

  const getSpecIcon = (spec: string = '') => Object.keys(SPEC_ICONS).find(k => spec.includes(k)) ? SPEC_ICONS[Object.keys(SPEC_ICONS).find(k => spec.includes(k))!] : '👨🌾';
  const getRatingStars = (r: number) => '★'.repeat(Math.min(Math.floor(r || 4), 5));

  const dialNumber = (phone: string) => {
    const rawNumber = phone.split('/')[0].split(',')[0].trim();
    Linking.openURL(`tel:${rawNumber}`).catch(() => Alert.alert('Error', 'Unable to open phone dialer.'));
  };

  // ---------------------------------------- RENDER

  const renderStatePicker = () => {
    const filtered = states.filter(s => s.toLowerCase().includes(pickerSearch.toLowerCase()));
    return (
      <Modal visible={showStatePicker} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State</Text>
                <TouchableOpacity onPress={() => { setShowStatePicker(false); setPickerSearch(''); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchWrapModal}>
                <Text style={styles.searchIconModal}>🔍</Text>
                <TextInput
                  style={styles.searchInputModal}
                  placeholder="Find your state..."
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, item === selectedState && styles.pickerItemSel]}
                    onPress={() => { setSelectedState(item); setShowStatePicker(false); setPickerSearch(''); }}
                  >
                    <Text style={[styles.pickerText, item === selectedState && styles.pickerTextSel]}>{item}</Text>
                    {item === selectedState && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderFormModal = () => {
    if (!selectedOfficer) return null;
    return (
      <Modal visible={showModal} animationType="fade" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formModalOverlay}>
            <View style={styles.formModalCard}>
              <LinearGradient colors={['#14b8a6', '#10b981']} style={styles.formHeaderLine}>
                <View>
                  <Text style={styles.formTitle}>📅 Book Consultation</Text>
                  <Text style={styles.formSubtitle}>with {selectedOfficer.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)}><Text style={{ color: '#fff', fontSize: 24, padding: 4 }}>✕</Text></TouchableOpacity>
              </LinearGradient>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.officerStamp}>
                  <View style={styles.stampIconBox}><Text style={styles.stampIcon}>{getSpecIcon(selectedOfficer.specialization)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stampName}>{selectedOfficer.name}</Text>
                    <Text style={styles.stampDesig}>{selectedOfficer.designation}</Text>
                  </View>
                </View>

                <Text style={styles.formLabel}>📝 Subject</Text>
                <TextInput style={styles.formInput} value={consultForm.subject} onChangeText={(t) => setConsultForm({...consultForm, subject: t})} placeholder="e.g. Crop disease identification" />

                <Text style={styles.formLabel}>📋 Description</Text>
                <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} value={consultForm.description} onChangeText={(t) => setConsultForm({...consultForm, description: t})} placeholder="Describe your issue..." multiline />

                <Text style={styles.formLabel}>📞 Consultation Type</Text>
                <View style={styles.typeGrid}>
                  {[
                    { id: 'phone', icon: '📞', label: 'Phone' },
                    { id: 'video', icon: '📹', label: 'Video' },
                    { id: 'visit', icon: '🚜', label: 'Farm Visit' },
                    { id: 'office', icon: '🏢', label: 'Office' },
                  ].map(t => (
                    <TouchableOpacity key={t.id} onPress={() => setConsultForm({...consultForm, consultation_type: t.id})} style={[styles.typeBtn, consultForm.consultation_type === t.id && styles.typeBtnAct]}>
                      <Text style={styles.typeIcon}>{t.icon}</Text>
                      <Text style={[styles.typeLbl, consultForm.consultation_type === t.id && styles.typeLblAct]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.rowGrid}>
                  <View style={styles.col}>
                    <Text style={styles.formLabel}>📅 Date</Text>
                    <TextInput style={styles.formInput} value={consultForm.preferred_date} editable={false} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.formLabel}>â ° Time</Text>
                    <TextInput style={styles.formInput} value={consultForm.preferred_time} editable={false} />
                  </View>
                </View>

                <Text style={styles.formLabel}>📱 Your Phone</Text>
                <TextInput style={styles.formInput} value={consultForm.farmer_phone} keyboardType="phone-pad" onChangeText={(t) => setConsultForm({...consultForm, farmer_phone: t})} placeholder="+91..." />

                <TouchableOpacity style={styles.submitBtn} onPress={submitConsultation} disabled={booking}>
                  {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>✅ Confirm Booking</Text>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={styles.root}>
      {renderStatePicker()}
      {renderFormModal()}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#14b8a6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.heroCard}>
          <LinearGradient colors={['#0f766e', '#10b981', '#22c55e']} style={styles.heroGradient}>
            <Text style={styles.heroEmoji}>👨🌾</Text>
            <View style={styles.heroContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                  <Text style={{ fontSize: 24, color: '#fff', fontWeight: '800' }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.heroTitle}>Agricultural Experts</Text>
              </View>
              <Text style={styles.heroSub}>Connect & Consult Top Officers</Text>
              {selectedState ? <View style={styles.heroBadge}><Text style={styles.heroBadgeTxt}>📍 {selectedState}</Text></View> : null}
            </View>
          </LinearGradient>
          <View style={styles.heroStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{officers.length || '--'}</Text>
              <Text style={styles.statLabel}>Experts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{consultants.length || '--'}</Text>
              <Text style={styles.statLabel}>📹 Consult.</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{consultants.filter(c => c.is_online).length || '--'}</Text>
              <Text style={styles.statLabel}>🟢 Online</Text>
            </View>
          </View>
        </View>

        {/* STATE SELECTOR */}
        <TouchableOpacity style={styles.stateSelectBox} onPress={() => setShowStatePicker(true)}>
          <View>
            <Text style={styles.stateLabel}>🗺 Current State</Text>
            <Text style={styles.stateValue}>{selectedState || 'Select State'}</Text>
          </View>
          <Text style={{ fontSize: 24, color: Colors.primary }}>🔍</Text>
        </TouchableOpacity>

        {/* TABS */}
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'officers', label: '🏛️ Experts' },
              { id: 'consultants', label: '📹 Consultants' },
              { id: 'helplines', label: '📞 Helplines' },
              { id: 'bookings', label: '📋 Bookings' },
            ].map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  setActiveTab(t.id);
                  if (t.id === 'bookings') fetchConsultations();
                  if (t.id === 'helplines' && !helplines) fetchHelplines();
                  if (t.id === 'officers' && officers.length === 0) fetchAIExperts();
                  if (t.id === 'consultants' && consultants.length === 0) fetchConsultants();
                }}
                style={[styles.tabBtn, activeTab === t.id && styles.tabBtnAct]}
              >
                <Text style={[styles.tabTxt, activeTab === t.id && styles.tabTxtAct]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- EXPERTS DIRECTORY --- */}
        {activeTab === 'officers' && (
          <View style={styles.tabContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 40 }} />
            ) : officers.length === 0 ? (
              <Text style={styles.emptyMsg}>No experts found for {selectedState}. Press refresh or try another state.</Text>
            ) : (
              <View style={styles.list}>
                {officers.map((off, i) => {
                  const gradient = GRADIENTS[i % GRADIENTS.length];
                  return (
                    <View key={i} style={styles.expertCard}>
                      <LinearGradient colors={gradient} style={styles.expertStripe} />
                      <View style={styles.expertBody}>
                        
                        <View style={styles.expertHead}>
                          <LinearGradient colors={gradient} style={styles.expertIconWrap}>
                            <Text style={styles.expertIcon}>{getSpecIcon(off.specialization)}</Text>
                          </LinearGradient>
                          <View style={styles.expertHeadTitle}>
                            <Text style={styles.expName}>{off.name}</Text>
                            <Text style={[styles.expDesig, { color: gradient[0] }]}>{off.designation}</Text>
                            <Text style={styles.expRating}>{getRatingStars(off.rating)} ({off.rating})</Text>
                          </View>
                          <View style={[styles.statusBadge, off.is_available ? styles.bgGreen : styles.bgRed]}>
                            <Text style={[styles.statusTxt, off.is_available ? styles.txtGreen : styles.txtRed]}>
                              {off.is_available ? '🟢 Avail' : '🔴 Busy'}
                            </Text>
                          </View>
                        </View>

                        {off.notable_work && (
                          <View style={styles.notableBox}>
                            <Text style={styles.notableLbl}>🏛️ Notable Work</Text>
                            <Text style={styles.notableTxt} numberOfLines={2}>{off.notable_work}</Text>
                          </View>
                        )}

                        <View style={styles.infoGrid}>
                          <Text style={styles.infoLine}>🎓 {off.specialization}</Text>
                          <Text style={styles.infoLine}>💼 {off.experience_years} yrs exp.</Text>
                          <Text style={styles.infoLine}>🗣 {off.languages}</Text>
                          <Text style={styles.infoLine}>📍 {off.office_address || off.department}</Text>
                        </View>

                        <View style={styles.contactRow}>
                          <TouchableOpacity style={styles.contactBtnBlue} onPress={() => dialNumber(off.phone)}>
                            <Text style={styles.contactTxtBlue}>📞 {off.phone}</Text>
                          </TouchableOpacity>
                          <View style={styles.contactBtnPurp}>
                            <Text style={styles.contactTxtPurp} numberOfLines={1}>✉ {off.email}</Text>
                          </View>
                        </View>

                        <View style={styles.expertFoot}>
                          <View style={styles.feeBadge}>
                            <Text style={styles.feeTxt}>{off.consultation_fee === 'Free' ? '🆓 Free Consult' : `💰 ${off.consultation_fee}`}</Text>
                          </View>

                          <View style={styles.actionRow}>
                            {off.is_available && (
                              <TouchableOpacity style={styles.bookBtn} onPress={() => openConsultation(off)}>
                                <Text style={styles.bookBtnTxt}>📅 Book</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.callBtn} onPress={() => dialNumber(off.phone)}>
                              <Text style={styles.callBtnTxt}>📱 Call</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* --- CONSULTANTS (from Consultant Portal) --- */}
        {activeTab === 'consultants' && (
          <View style={styles.tabContent}>
            {consultantsLoading ? (
              <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 40 }} />
            ) : consultants.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 56 }}>👨‍💻</Text>
                <Text style={styles.emptyMsg}>No consultants found for {selectedState}</Text>
                <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 4, textAlign: 'center' }}>Consultants can register at the web portal</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {consultants.map((c, i) => {
                  const gradient = GRADIENTS[i % GRADIENTS.length];
                  return (
                    <View key={c._id || i} style={styles.consultantCard}>
                      <LinearGradient colors={gradient} style={styles.expertStripe} />
                      <View style={styles.consultantBody}>
                        {/* Header */}
                        <View style={styles.consultantHead}>
                          <LinearGradient colors={c.is_online ? ['#10b981', '#14b8a6'] : ['#94a3b8', '#64748b']} style={styles.consultantAvatarWrap}>
                            <Text style={styles.consultantAvatarTxt}>{(c.name || 'C').charAt(0)}</Text>
                          </LinearGradient>
                          <View style={styles.consultantHeadInfo}>
                            <Text style={styles.consultantName}>{c.name}</Text>
                            <Text style={[styles.consultantDesig, { color: gradient[0] }]}>{c.designation}</Text>
                          </View>
                          <View style={[styles.onlineBadge, c.is_online ? styles.onlineBadgeOn : styles.onlineBadgeOff]}>
                            <View style={[styles.onlineDot, { backgroundColor: c.is_online ? '#10b981' : '#94a3b8' }]} />
                            <Text style={[styles.onlineLabel, { color: c.is_online ? '#065f46' : '#64748b' }]}>
                              {c.is_online ? 'Online' : 'Offline'}
                            </Text>
                          </View>
                        </View>

                        {/* Details */}
                        <View style={styles.consultantDetails}>
                          <Text style={styles.infoLine}>🎓 {c.specialization}</Text>
                          <Text style={styles.infoLine}>📍 {c.state}{c.district ? `, ${c.district}` : ''}</Text>
                          <Text style={styles.infoLine}>💼 {c.experience_years || 0} years experience</Text>
                          <Text style={styles.infoLine}>🗣 {c.languages || 'Hindi, English'}</Text>
                          <Text style={styles.infoLine}>⏰ {c.available_hours || '10:00 AM - 5:00 PM'}</Text>
                          <Text style={styles.infoLine}>💰 {c.consultation_fee || 'Free'}</Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.consultantActions}>
                          {c.phone && (
                            <TouchableOpacity style={styles.consultantPhoneBtn} onPress={() => dialNumber(c.phone)}>
                              <Text style={styles.consultantPhoneTxt}>📞 Call</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.consultantVideoBtn, !c.is_online && styles.consultantVideoBtnOff]}
                            onPress={() => c.is_online ? startVideoCall(c) : null}
                            disabled={!c.is_online}
                          >
                            <Text style={[styles.consultantVideoTxt, !c.is_online && styles.consultantVideoTxtOff]}>
                              📹 {c.is_online ? 'Video Call' : 'Unavailable'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* --- HELPLINES --- */}
        {activeTab === 'helplines' && (
          <View style={styles.tabContent}>
            {helplinesLoading ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
            ) : !helplines ? (
              <Text style={styles.emptyMsg}>Please select a state to load matching helplines.</Text>
            ) : (
              <View>
                <View style={styles.verifiedBox}>
                  <Text style={styles.verifiedHdr}>✅ Verified Government Numbers</Text>
                  <Text style={styles.verifiedTxt}>Toll-free numbers starting with 1800 are completely free to call from any phone.</Text>
                </View>

                {helplines.state?.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={styles.sectionTitle}>🏛️ State Helplines ({helplines.state_name})</Text>
                    {helplines.state.map((h: any, i: number) => (
                      <View key={i} style={styles.helpCard}>
                        <View style={styles.helpHead}>
                          <View style={styles.helpIconOrng}><Text style={styles.helpIconEmoji}>🏛️</Text></View>
                          <View style={{ flex: 1, paddingLeft: 12 }}>
                            <Text style={styles.helpName}>{h.name}</Text>
                            <Text style={styles.helpDesc}>{h.description}</Text>
                          </View>
                        </View>
                        <View style={styles.helpFoot}>
                          <TouchableOpacity style={styles.dialBtn} onPress={() => dialNumber(h.number)}>
                            <Text style={styles.dialBtnTxt}>📞 Dial {h.number}</Text>
                          </TouchableOpacity>
                          <View style={styles.tollFreeBadge}><Text style={styles.tollFreeTxt}>🆓 Toll Free</Text></View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View>
                  <Text style={styles.sectionTitle}>🇮🇳 National Helplines</Text>
                  {helplines.national?.map((h: any, i: number) => (
                    <View key={i} style={styles.helpCard}>
                      <View style={styles.helpHead}>
                        <View style={styles.helpIconBlue}><Text style={styles.helpIconEmoji}>{h.icon}</Text></View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <View style={styles.natTitleRow}>
                            <Text style={styles.helpName}>{h.name}</Text>
                            {h.toll_free && <View style={styles.tfMini}><Text style={styles.tfMiniTxt}>🆓</Text></View>}
                          </View>
                          <View style={styles.catBadge}><Text style={styles.catTxt}>{h.category}</Text></View>
                          <Text style={styles.helpDesc}>{h.description}</Text>
                        </View>
                      </View>
                      <View style={styles.helpFoot}>
                        <TouchableOpacity style={styles.dialBtn} onPress={() => dialNumber(h.number)}>
                          <Text style={styles.dialBtnTxt}>📞 {h.number}</Text>
                        </TouchableOpacity>
                        {h.website && (
                          <TouchableOpacity style={styles.webBtn} onPress={() => Linking.openURL(h.website)}>
                            <Text style={styles.webBtnTxt}>🌐 Website</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

              </View>
            )}
          </View>
        )}

        {/* --- BOOKINGS --- */}
        {activeTab === 'bookings' && (
          <View style={styles.tabContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 40 }} />
            ) : consultations.length === 0 ? (
              <Text style={styles.emptyMsg}>No booked consultations yet. Browse experts to schedule a call.</Text>
            ) : (
              <View style={styles.list}>
                {consultations.map((c, i) => {
                  const isCancel = c.status === 'cancelled';
                  return (
                    <View key={i} style={styles.card}>
                      <View style={[styles.cardStripe, isCancel ? { backgroundColor: '#f43f5e' } : { backgroundColor: '#10b981' }]} />
                      <View style={styles.cardBody}>
                        
                        <View style={styles.bookHead}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.bookSubj}>{c.subject}</Text>
                            <Text style={styles.bookOffi}>{c.officer?.name || 'Agri Officer'} • {c.officer?.designation || ''}</Text>
                          </View>
                          <View style={[styles.statusBadge, isCancel ? styles.bgRed : (c.status === 'completed' ? styles.bgGreen : styles.bgBlue)]}>
                            <Text style={[styles.statusTxt, isCancel ? styles.txtRed : (c.status === 'completed' ? styles.txtGreen : styles.txtBlue)]}>
                              {c.status?.toUpperCase() || 'PENDING'}
                            </Text>
                          </View>
                        </View>

                        {c.description && <Text style={styles.bookDesc}>{c.description}</Text>}

                        <View style={styles.bookGrid}>
                          <Text style={styles.bookMeta}>📅 {new Date(c.preferred_date || Date.now()).toLocaleDateString()}</Text>
                          <Text style={styles.bookMeta}>â ° {c.preferred_time || '10:00'}</Text>
                          <Text style={styles.bookMeta}>📞 {c.consultation_type?.toUpperCase()}</Text>
                        </View>

                        {c.status === 'pending' && (
                          <TouchableOpacity style={styles.btnCancelBook} onPress={() => cancelConsultation(c._id || c.id)}>
                            <Text style={styles.btnCancelTxt}>❌ Cancel Consultation</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingTop: STATUSBAR_H, paddingHorizontal: 16 },

  // Hero
  heroCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 8 },
  heroGradient: { padding: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  heroEmoji: { fontSize: 48, opacity: 0.9, marginRight: 16 },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginTop: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
  heroBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  heroStats: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12 },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#0f766e' },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },

  // Select box
  stateSelectBox: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  stateLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  stateValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: 2 },

  // Tabs
  tabsWrap: { marginBottom: 16 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
  tabBtnAct: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  tabTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  tabTxtAct: { color: '#fff' },
  tabContent: { flex: 1 },

  emptyMsg: { textAlign: 'center', marginTop: 40, fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '500', paddingHorizontal: 20, lineHeight: 24 },
  list: { gap: 16 },

  // Expert Card
  expertCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  expertStripe: { height: 6 },
  expertBody: { padding: 20 },
  expertHead: { flexDirection: 'row', marginBottom: 16 },
  expertIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  expertIcon: { fontSize: 24 },
  expertHeadTitle: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  expName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  expDesig: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  expRating: { fontSize: 10, color: '#f59e0b', fontWeight: '800', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusTxt: { fontSize: 10, fontWeight: '800' },
  bgGreen: { backgroundColor: '#d1fae5' }, txtGreen: { color: '#059669', fontSize: 10, fontWeight: '800' },
  bgRed: { backgroundColor: '#ffe4e6' }, txtRed: { color: '#e11d48', fontSize: 10, fontWeight: '800' },
  bgBlue: { backgroundColor: '#dbeafe' }, txtBlue: { color: '#2563eb', fontSize: 10, fontWeight: '800' },
  
  notableBox: { backgroundColor: '#f5f3ff', padding: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ede9fe' },
  notableLbl: { fontSize: 10, fontWeight: '800', color: '#6d28d9', marginBottom: 2 },
  notableTxt: { fontSize: 12, color: '#4c1d95', lineHeight: 18 },

  infoGrid: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, gap: 6, marginBottom: 16 },
  infoLine: { fontSize: 12, color: '#475569', fontWeight: '500' },
  
  contactRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  contactBtnBlue: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' },
  contactTxtBlue: { fontSize: 10, color: '#2563eb', fontWeight: '700' },
  contactBtnPurp: { flex: 1, backgroundColor: '#faf5ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#f3e8ff' },
  contactTxtPurp: { fontSize: 10, color: '#9333ea', fontWeight: '700' },

  expertFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  feeBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  feeTxt: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  actionRow: { flexDirection: 'row', gap: 8 },
  bookBtn: { backgroundColor: '#14b8a6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  callBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  callBtnTxt: { color: '#475569', fontSize: 12, fontWeight: '800' },

  // Helplines
  verifiedBox: { backgroundColor: '#d1fae5', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#a7f3d0' },
  verifiedHdr: { fontSize: FontSize.sm, fontWeight: '800', color: '#065f46', marginBottom: 4 },
  verifiedTxt: { fontSize: 12, color: '#047857', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  
  helpCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  helpHead: { flexDirection: 'row', marginBottom: 16 },
  helpIconOrng: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  helpIconBlue: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  helpIconEmoji: { fontSize: 20, color: '#fff' },
  helpName: { fontSize: 14, fontWeight: '800', color: Colors.text, flex: 1 },
  helpDesc: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 },
  natTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tfMini: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tfMiniTxt: { fontSize: 8 },
  catBadge: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  catTxt: { fontSize: 10, color: '#2563eb', fontWeight: '800' },
  
  helpFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flex: 1, alignItems: 'center' },
  dialBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tollFreeBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  tollFreeTxt: { color: '#16a34a', fontSize: 12, fontWeight: '800' },
  webBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  webBtnTxt: { color: '#475569', fontSize: 12, fontWeight: '800' },

  // Bookings (Reusable card base)
  card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardStripe: { height: 6 },
  cardBody: { padding: 20 },
  bookHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bookSubj: { fontSize: 16, fontWeight: '800', color: Colors.text },
  bookOffi: { fontSize: 12, fontWeight: '700', color: '#14b8a6', marginTop: 2 },
  bookDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
  bookMeta: { fontSize: 12, fontWeight: '600', color: '#334155', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  btnCancelBook: { backgroundColor: '#ffe4e6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  btnCancelTxt: { color: '#e11d48', fontSize: 12, fontWeight: '800' },

  // Picker Moda
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 24, color: Colors.textMuted },
  searchWrapModal: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center' },
  searchIconModal: { fontSize: 16, marginRight: 8 },
  searchInputModal: { flex: 1, paddingVertical: 14, fontSize: FontSize.md, color: Colors.text },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pickerItemSel: { backgroundColor: '#f0fdf4' },
  pickerText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  pickerTextSel: { color: '#16a34a', fontWeight: '800' },
  checkmark: { color: '#16a34a', fontSize: 20, fontWeight: '800' },

  // Form Moda
  formModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  formModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  formHeaderLine: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  formSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  formScroll: { padding: 24 },
  
  officerStamp: { backgroundColor: '#ecfdf5', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  stampIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  stampIcon: { fontSize: 20 },
  stampName: { fontSize: 14, fontWeight: '800', color: '#064e3b' },
  stampDesig: { fontSize: 12, fontWeight: '600', color: '#059669', marginTop: 2 },

  formLabel: { fontSize: 12, fontWeight: '800', color: Colors.text, marginBottom: 8, marginTop: 12 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: Colors.text },
  
  typeGrid: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  typeBtnAct: { backgroundColor: '#f0fdf4', borderColor: '#14b8a6', borderWidth: 2 },
  typeIcon: { fontSize: 18, marginBottom: 4 },
  typeLbl: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  typeLblAct: { color: '#0f766e' },

  rowGrid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  submitBtn: { backgroundColor: '#14b8a6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Consultant Cards
  consultantCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 0 },
  consultantBody: { padding: 20 },
  consultantHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  consultantAvatarWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  consultantAvatarTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },
  consultantHeadInfo: { flex: 1, marginLeft: 12 },
  consultantName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  consultantDesig: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  onlineBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  onlineBadgeOn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  onlineBadgeOff: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineLabel: { fontSize: 10, fontWeight: '800' },
  consultantDetails: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, gap: 6, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  consultantActions: { flexDirection: 'row', gap: 10 },
  consultantPhoneBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  consultantPhoneTxt: { fontSize: 13, fontWeight: '800', color: '#334155' },
  consultantVideoBtn: { flex: 2, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: '#0f766e' },
  consultantVideoBtnOff: { backgroundColor: '#e2e8f0' },
  consultantVideoTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  consultantVideoTxtOff: { color: '#94a3b8' },
});

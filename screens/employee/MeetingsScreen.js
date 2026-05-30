import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, User, Phone, MapPin, ClipboardList, Check, Calendar, ArrowRight, X, Pencil, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { meetingApi, uploadAPI } from '../../services/api';

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  // New Meeting Form States
  const [clientName, setClientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [meetingAddress, setMeetingAddress] = useState('');
  const [status, setStatus] = useState('scheduled'); // 'scheduled' (Pending), 'completed', 'follow-up'
  const [meetingNotes, setMeetingNotes] = useState('');
  const [selfieImage, setSelfieImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleFetchCurrentLocation = async () => {
    try {
      setFetchingLocation(true);
      
      // Request permissions
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to fetch current address.');
        return;
      }

      // Get location
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const res = geocoded[0];
        const street = res.street || res.name || '';
        const district = res.district || res.subregion || '';
        const city = res.city || '';
        const region = res.region || '';
        const code = res.postalCode || '';
        
        const fullAddress = [street, district, city, region, code]
          .filter(part => part && part.trim().length > 0)
          .join(', ');
          
        setMeetingAddress(fullAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        setMeetingAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (err) {
      console.log('⚠️ MeetingsScreen: Location fetch error:', err.message);
      Alert.alert('Error', 'Failed to fetch current location address. Please try again.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await meetingApi.getMy();
      if (res.data && res.data.success) {
        setMeetings(res.data.meetings || []);
      }
      console.log("miting",res)
    } catch (err) {
      console.log('⚠️ MeetingsScreen: Failed to fetch:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const handleOpenAddModal = () => {
    setEditingMeeting(null);
    setClientName('');
    setMobileNumber('');
    setMeetingAddress('');
    setStatus('scheduled');
    setMeetingNotes('');
    setSelfieImage(null);
    setModalVisible(true);
  };

  const handleCaptureSelfie = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to log a meeting.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelfieImage(result.assets[0]);
      }
    } catch (error) {
      console.log('Error capturing selfie:', error);
      Alert.alert('Error', 'Failed to capture selfie.');
    }
  };

  const handleEditMeeting = (item) => {
    setEditingMeeting(item);
    setClientName(item.clientName || '');
    setMobileNumber(item.mobileNumber || '');
    setMeetingAddress(item.meetingAddress || '');
    setStatus(item.status || 'scheduled');
    setMeetingNotes(item.meetingNotes || '');
    setSelfieImage(null); // Optional: Could fetch existing selfie if needed, but null for new edits
    setModalVisible(true);
  };

  const handleSaveMeeting = async () => {
    if (!clientName.trim() || !mobileNumber.trim() || !meetingAddress.trim()) {
      Alert.alert('Required Fields', 'Please complete Client Name, Mobile, and Address.');
      return;
    }

    if (!editingMeeting && !selfieImage) {
      Alert.alert('Selfie Required', 'Please capture a selfie to log this meeting.');
      return;
    }

    if (clientName.trim() === mobileNumber.trim()) {
      Alert.alert('Invalid Input', 'Client name and mobile number cannot be the same.');
      return;
    }

    if (!editingMeeting) {
      const duplicate = meetings.find(m => 
        m.mobileNumber === mobileNumber.trim() || 
        (m.clientName && m.clientName.trim().toLowerCase() === clientName.trim().toLowerCase())
      );
      if (duplicate) {
        Alert.alert('Duplicate Found', 'A client meeting with this Name or Mobile Number already exists.');
        return;
      }
    }

    try {
      setSubmitting(true);

      let uploadedSelfieUrl = null;
      if (selfieImage) {
        const formData = new FormData();
        formData.append('file', {
          uri: selfieImage.uri,
          type: 'image/jpeg',
          name: `meeting_selfie_${Date.now()}.jpg`
        });
        formData.append('folder', '/crm-tracker/meetings');
        
        const uploadRes = await uploadAPI.uploadImageFormData(formData);
        if (uploadRes.data && uploadRes.data.success) {
          uploadedSelfieUrl = uploadRes.data.url;
        } else {
          Alert.alert('Upload Failed', 'Failed to upload selfie. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const data = {
        clientName,
        mobileNumber,
        meetingAddress,
        status,
        meetingNotes,
        ...(uploadedSelfieUrl && { selfieUrl: uploadedSelfieUrl })
      };

      let res;
      if (editingMeeting) {
        res = await meetingApi.update(editingMeeting._id || editingMeeting.id, data);
      } else {
        res = await meetingApi.create(data);
      }

      if (res.data && res.data.success) {
        Alert.alert('Success', editingMeeting ? 'Client visit report updated!' : 'Client visit meeting logged successfully!');
        setModalVisible(false);
        // Clear Form
        setClientName('');
        setMobileNumber('');
        setMeetingAddress('');
        setStatus('scheduled');
        setMeetingNotes('');
        setSelfieImage(null);
        setEditingMeeting(null);
        fetchMeetings();
      }
    } catch (err) {
      console.log('⚠️ MeetingsScreen: Failed to save:', err.message);
      Alert.alert('Error', 'Failed to save meeting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (statusVal) => {
    switch (statusVal) {
      case 'completed':
        return { bg: '#dcfce7', text: '#15803d', label: 'COMPLETED' };
      case 'follow-up':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'FOLLOW-UP' };
      default:
        return { bg: '#fef3c7', text: '#d97706', label: 'PENDING' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Client Visits</Text>
              <Text style={styles.headerSub}>Database Logged Field Meetings</Text>
            </View>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>{meetings.length} LOGGED</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.loadingText}>Fetching database reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1d4ed8']} />
          }
        >
          {meetings.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <ClipboardList size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Visits Logged</Text>
              <Text style={styles.emptySub}>
                You haven't registered any client visit meetings yet. Press the (+) button below to log your first field visit!
              </Text>
            </Surface>
          ) : (
            meetings.map((item) => {
              const badge = getStatusBadgeStyle(item.status);
              return (
                <Surface key={item._id || item.id} style={styles.meetingCard} elevation={2}>
                  <View style={styles.cardHeader}>
                    <View style={styles.clientInfoBlock}>
                      <User size={16} color="#475569" style={{ marginRight: 6 }} />
                      <Text style={styles.clientNameText}>{item.clientName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Phone size={13} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.metaText}>{item.mobileNumber}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={13} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.meetingAddress}</Text>
                  </View>

                  {item.meetingNotes ? (
                    <View style={styles.notesBlock}>
                      <Text style={styles.notesTitle}>FEEDBACK NOTES:</Text>
                      <Text style={styles.notesText}>{item.meetingNotes}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.cardFooter, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={styles.dateText}>
                        {new Date(item.date || item.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.editCardBtn} 
                      onPress={() => handleEditMeeting(item)}
                    >
                      <Pencil size={11} color="#1d4ed8" style={{ marginRight: 4 }} />
                      <Text style={styles.editCardBtnText}>Edit Report</Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddModal}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#1d4ed8', '#2563eb']}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Log Visit Modal Overlay */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMeeting ? 'Edit Client Visit' : 'Log Client Visit'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Client Name */}
              <Text style={styles.inputLabel}>Client Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#94a3b8" style={{ marginLeft: 12, marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter client name"
                  value={clientName}
                  onChangeText={setClientName}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Mobile Number */}
              <Text style={styles.inputLabel}>Mobile / Phone *</Text>
              <View style={styles.inputWrapper}>
                <Phone size={16} color="#94a3b8" style={{ marginLeft: 12, marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Visit Location Address */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
                <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Meeting Address *</Text>
                <TouchableOpacity onPress={handleFetchCurrentLocation} disabled={fetchingLocation}>
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#1d4ed8" />
                  ) : (
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' }}>Fetch Current</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <MapPin size={16} color="#94a3b8" style={{ marginLeft: 12, marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop or office address"
                  value={meetingAddress}
                  onChangeText={setMeetingAddress}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Status Pills */}
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.statusPill,
                    status === 'scheduled' && styles.statusPillActivePending,
                  ]}
                  onPress={() => setStatus('scheduled')}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'scheduled' && styles.statusPillTextActive,
                    ]}
                  >
                    PENDING
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusPill,
                    status === 'completed' && styles.statusPillActiveCompleted,
                  ]}
                  onPress={() => setStatus('completed')}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'completed' && styles.statusPillTextActive,
                    ]}
                  >
                    COMPLETED
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusPill,
                    status === 'follow-up' && styles.statusPillActiveFollowUp,
                  ]}
                  onPress={() => setStatus('follow-up')}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'follow-up' && styles.statusPillTextActive,
                    ]}
                  >
                    FOLLOW-UP
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Visit Notes / Feedback</Text>
              <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Write client requirements or feedback..."
                  multiline={true}
                  numberOfLines={4}
                  value={meetingNotes}
                  onChangeText={setMeetingNotes}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Selfie Capture Box */}
              {!editingMeeting && (
                <>
                  <Text style={styles.inputLabel}>Meeting Selfie *</Text>
                  <View style={styles.selfieContainer}>
                    {selfieImage ? (
                      <View style={styles.selfieImageWrapper}>
                        <Text style={{ fontSize: 12, color: '#10b981', marginBottom: 6, fontWeight: 'bold' }}>✓ Selfie Captured</Text>
                        <TouchableOpacity onPress={() => setSelfieImage(null)} style={styles.retakeBtn}>
                          <Text style={styles.retakeBtnText}>Retake Selfie</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.selfieUploadBox} onPress={handleCaptureSelfie}>
                        <Camera size={24} color="#1d4ed8" />
                        <Text style={styles.selfieBoxText}>Take a Selfie</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {/* Submit Button */}
              {submitting ? (
                <ActivityIndicator size="small" color="#1d4ed8" style={{ marginTop: 24, marginBottom: 12 }} />
              ) : (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSaveMeeting}
                >
                  <LinearGradient
                    colors={['#1d4ed8', '#2563eb']}
                    style={styles.submitBtnGradient}
                  >
                    <Text style={styles.submitBtnText}>
                      {editingMeeting ? 'Update Visit Report' : 'Save Visit Report'}
                    </Text>
                    <Check size={16} color="#fff" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  badgeCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  notesBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e1',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingHorizontal: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  statusPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusPillActivePending: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  statusPillActiveCompleted: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  statusPillActiveFollowUp: {
    backgroundColor: '#dbeafe',
    borderColor: '#1d4ed8',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  statusPillTextActive: {
    color: '#0f172a',
  },
  submitBtn: {
    marginTop: 28,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editCardBtnText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selfieContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  selfieUploadBox: {
    height: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  selfieBoxText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
    marginLeft: 8,
  },
  selfieImageWrapper: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  retakeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
  },
  retakeBtnText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 'bold',
  },
});

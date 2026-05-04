import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

const STATUS_COLORS = {
  pending: '#FF9500',
  confirmed: '#0077B6',
  completed: '#34C759',
  cancelled: '#FF3B30',
};

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

export default function PatientAppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/appointments/my-appointments/patient');
      setAppointments(res.data || []);
    } catch (error) {
      console.error('Fetch appointments error:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = (appointment) => {
    if (!canModify(appointment.date)) {
      Alert.alert('Action Restricted', 'Appointments can only be cancelled or updated at least 3 days before the scheduled date.');
      return;
    }

    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete your appointment with ${appointment.doctorId?.name ? (appointment.doctorId.name.startsWith('Dr.') ? appointment.doctorId.name : `Dr. ${appointment.doctorId.name}`) : 'the doctor'}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/appointments/${appointment._id}`);
              Alert.alert('Done', 'Your appointment has been deleted.');
              setShowDetailModal(false);
              fetchAppointments();
            } catch (error) {
              const msg = error.response?.data?.message || 'Failed to delete. Please try again.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleUpdate = (appointment) => {
    if (!canModify(appointment.date)) {
      Alert.alert('Action Restricted', 'Appointments can only be updated at least 3 days before the scheduled date.');
      return;
    }
    setShowDetailModal(false);
    navigation.navigate('DoctorDetail', { 
      doctor: appointment.doctorId, 
      editingAppointment: appointment 
    });
  };

  const canModify = (appointmentDate) => {
    const today = new Date();
    const aptDate = new Date(appointmentDate);
    const diffTime = aptDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 3; // Requirement: 2-4 days. Using 3.
  };

  const filteredAppointments =
    filter === 'All'
      ? appointments
      : appointments.filter(
          (a) => a.status?.toLowerCase() === filter.toLowerCase()
        );

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Appointments</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAppointments();
              }}
              colors={['#0DB591']}
            />
          }
        >
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={52} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>No Appointments</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'All'
                  ? 'You have no appointments yet.\nBook a doctor to get started.'
                  : `No ${filter.toLowerCase()} appointments.`}
              </Text>
              {filter === 'All' && (
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => navigation.navigate('Doctors')}
                >
                  <Text style={styles.browseBtnText}>Browse Doctors</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.cards}>
              {filteredAppointments.map((apt) => {
                const statusColor = STATUS_COLORS[apt.status?.toLowerCase()] || '#999';
                const doctor = apt.doctorId;

                return (
                  <TouchableOpacity 
                    key={apt._id} 
                    style={styles.card}
                    onPress={() => {
                      setSelectedAppointment(apt);
                      setShowDetailModal(true);
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.aptId}>ID: #{apt._id.slice(-6).toUpperCase()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{apt.status}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.doctorInfoRow}>
                        <Ionicons name="person-outline" size={16} color="#0DB591" />
                        <Text style={styles.doctorNameText}>
                          {doctor?.name ? (doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`) : 'Doctor'}
                        </Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Ionicons name="medical-outline" size={14} color="#666" />
                        <Text style={styles.infoText}>{doctor?.specialization || 'General'}</Text>
                      </View>

                      <View style={styles.dateTimeRow}>
                        <View style={styles.infoRow}>
                          <Ionicons name="calendar-outline" size={14} color="#666" />
                          <Text style={styles.infoText}>{formatDate(apt.date)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="time-outline" size={14} color="#666" />
                          <Text style={styles.infoText}>{apt.time}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <Text style={styles.tapPrompt}>Tap for details →</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 80 }} />
            </View>
          )}
        </ScrollView>
      )}

      {/* ── DETAIL MODAL ── */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Appointment ID</Text>
                  <Text style={styles.modalValue}>{selectedAppointment._id}</Text>
                </View>

                <View style={styles.modalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Doctor</Text>
                    <Text style={styles.modalValue}>
                      {selectedAppointment.doctorId?.name ? (selectedAppointment.doctorId.name.startsWith('Dr.') ? selectedAppointment.doctorId.name : `Dr. ${selectedAppointment.doctorId.name}`) : 'Doctor'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Category</Text>
                    <Text style={styles.modalValue}>{selectedAppointment.doctorId?.specialization}</Text>
                  </View>
                </View>

                <View style={styles.modalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Date</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedAppointment.date)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Time</Text>
                    <Text style={styles.modalValue}>{selectedAppointment.time}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedAppointment.status?.toLowerCase()] || '#999', alignSelf: 'flex-start' }]}>
                    <Text style={styles.statusText}>{selectedAppointment.status}</Text>
                  </View>
                </View>

                {selectedAppointment.description && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Reason / Notes</Text>
                    <Text style={styles.modalValueText}>{selectedAppointment.description}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Booked On</Text>
                  <Text style={styles.modalValue}>{new Date(selectedAppointment.createdAt).toLocaleString()}</Text>
                </View>

                {/* ── Actions for pending/confirmed ── */}
                {(selectedAppointment.status === 'Pending' || selectedAppointment.status === 'Confirmed') && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.updateBtn}
                      onPress={() => handleUpdate(selectedAppointment)}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.updateBtnText}>Update Appointment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => handleCancel(selectedAppointment)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      <Text style={styles.deleteBtnText}>Delete Appointment</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.policyText}>* Updates/Deletions allowed up to 3 days before</Text>
                  </View>
                )}

                {/* ── Access records for completed ── */}
                {selectedAppointment.status === 'Completed' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.recordBtn, { backgroundColor: '#E8F8F5' }]}
                      onPress={() => { setShowDetailModal(false); navigation.navigate('PrescriptionDetail', { appointmentId: selectedAppointment._id }); }}
                    >
                      <Ionicons name="document-text-outline" size={20} color="#0DB591" />
                      <Text style={[styles.recordBtnText, { color: '#0DB591' }]}>View Prescription</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.recordBtn, { backgroundColor: '#EEF3FF' }]}
                      onPress={() => { setShowDetailModal(false); navigation.navigate('BillingDetail', { appointmentId: selectedAppointment._id }); }}
                    >
                      <Ionicons name="receipt-outline" size={20} color="#3A7BFF" />
                      <Text style={[styles.recordBtnText, { color: '#3A7BFF' }]}>View Bill</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F6',
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#E0E8F0',
  },
  filterBtnActive: {
    backgroundColor: '#0DB591',
    borderColor: '#0DB591',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  rescheduledAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    marginBottom: 12,
    gap: 8,
  },
  rescheduledAlertText: {
    color: '#D97700',
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
  },
  browseBtn: {
    marginTop: 20,
    backgroundColor: '#0DB591',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cards: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#0DB591',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F8F5',
    marginRight: 10,
  },
  doctorAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B4A',
    marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#555',
  },
  descBox: {
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Simplified Card
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aptId: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.5 },
  cardBody: { gap: 8 },
  doctorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doctorNameText: { fontSize: 16, fontWeight: '700', color: '#1A2B4A' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#666' },
  dateTimeRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  tapPrompt: { fontSize: 11, color: '#0DB591', fontWeight: '600', textAlign: 'right', marginTop: 10 },

  // ── Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A2B4A' },
  modalSection: { marginBottom: 16 },
  modalRow: { flexDirection: 'row', gap: 15, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase', marginBottom: 4 },
  modalValue: { fontSize: 15, fontWeight: '700', color: '#333' },
  modalValueText: { fontSize: 14, color: '#555', lineHeight: 20 },
  modalActions: { marginTop: 10, gap: 12, paddingBottom: 20 },
  updateBtn: { backgroundColor: '#0DB591', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { backgroundColor: '#FFF0F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#FFDADA' },
  deleteBtnText: { color: '#FF3B30', fontWeight: '700', fontSize: 15 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 10 },
  recordBtnText: { fontWeight: '700', fontSize: 15 },
  policyText: { fontSize: 11, color: '#999', textAlign: 'center', fontStyle: 'italic' },
});

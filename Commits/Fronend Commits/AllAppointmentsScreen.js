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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#FF9500';
    case 'confirmed':
      return '#0077B6';
    case 'completed':
      return '#34C759';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8DA8A4';
  }
};

export default function AllAppointmentsScreen({ currentUser, navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled

  // Reschedule Modal State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // Fetch appointments via the doctor-specific endpoint
      const response = await axiosInstance.get('/appointments/my-appointments/doctor');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredAppointments = () => {
    if (filter === 'all') return appointments;
    return appointments.filter((apt) => apt.status?.toLowerCase() === filter.toLowerCase());
  };

  const filteredAppointments = getFilteredAppointments();

  const openRescheduleModal = (appointment) => {
    // Cannot request reschedule on the same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      Alert.alert('Not Allowed', 'Cannot request a reschedule on the same day as the appointment.');
      return;
    }

    if (appointment.rescheduleRequested) {
      Alert.alert('Pending Request', 'A reschedule request is already pending for this appointment.');
      return;
    }

    setSelectedAppointment(appointment);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    setRescheduleModalVisible(true);
  };

  const submitRescheduleRequest = async () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleReason) {
      Alert.alert('Missing Fields', 'Please fill out the new date, time, and reason.');
      return;
    }

    try {
      setSubmittingReschedule(true);
      await axiosInstance.post(`/appointments/${selectedAppointment._id}/request-reschedule`, {
        rescheduleDate,
        rescheduleTime,
        reason: rescheduleReason,
      });
      
      Alert.alert('Success', 'Reschedule request submitted to Admin.');
      setRescheduleModalVisible(false);
      fetchAppointments();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });
      fetchAppointments();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#0077B6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Appointments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filter === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAppointments();
            }}
          />
        }
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D1D1" />
            <Text style={styles.emptyStateText}>No appointments</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all'
                ? 'You have no appointments'
                : `No ${filter} appointments`}
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {filteredAppointments.map((appointment) => (
              <View key={appointment._id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.patientName}>
                      {appointment.patientName || 'Patient'}
                    </Text>
                    <Text style={styles.appointmentDate}>
                      <Ionicons name="calendar-outline" size={14} color="#666" />
                      {' '}
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.appointmentTime}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      {' '}{appointment.time}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>

                {appointment.description && (
                  <View style={styles.description}>
                    <Text style={styles.descriptionLabel}>Reason:</Text>
                    <Text style={styles.descriptionText}>{appointment.description}</Text>
                  </View>
                )}

                {appointment.notes && (
                  <View style={styles.notes}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{appointment.notes}</Text>
                  </View>
                )}

                {appointment.status === 'Pending' && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => updateStatus(appointment._id, 'Confirmed')}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      onPress={() => updateStatus(appointment._id, 'Cancelled')}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {appointment.status === 'Confirmed' && !appointment.rescheduleRequested && (
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => openRescheduleModal(appointment)}
                  >
                    <Ionicons name="calendar" size={14} color="#0077B6" />
                    <Text style={styles.rescheduleBtnText}>Request Reschedule</Text>
                  </TouchableOpacity>
                )}
                
                {appointment.rescheduleRequested && (
                  <View style={styles.pendingRequestBadge}>
                    <Ionicons name="time" size={14} color="#FF9500" />
                    <Text style={styles.pendingRequestText}>Reschedule Requested</Text>
                  </View>
                )}

                {appointment.status === 'Completed' && (
                  <TouchableOpacity
                    style={styles.prescriptionBtn}
                    onPress={() => navigation.navigate('AddPrescription', { appointment })}
                  >
                    <Ionicons name="document-text" size={14} color="#FFF" />
                    <Text style={styles.prescriptionBtnText}>Attach Prescription</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.timestampRow}>
                  <Text style={styles.timestamp}>
                    Created: {new Date(appointment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Reschedule</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Request Admin to reschedule appointment with {selectedAppointment?.patientName}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="e.g. 2026-05-10"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Time</Text>
              <TextInput
                style={styles.input}
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
                placeholder="e.g. 10:30 AM"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                placeholder="Reason for rescheduling..."
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submittingReschedule && { opacity: 0.7 }]}
              onPress={submitRescheduleRequest}
              disabled={submittingReschedule}
            >
              {submittingReschedule ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#0077B6',
    borderColor: '#0077B6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#999',
  },
  appointmentsList: {
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0077B6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0077B6',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  notes: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0077B6',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  timestampRow: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#AAA',
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0077B6',
    backgroundColor: '#F0F8FF',
  },
  rescheduleBtnText: {
    color: '#0077B6',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmBtn: {
    backgroundColor: '#0077B6',
  },
  cancelBtn: {
    backgroundColor: '#FF3B30',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFF8E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  pendingRequestText: {
    color: '#D97700',
    fontSize: 12,
    fontWeight: '600',
  },
  prescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7B1FA2',
  },
  prescriptionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

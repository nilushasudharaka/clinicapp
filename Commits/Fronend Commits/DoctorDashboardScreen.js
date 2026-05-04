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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

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

export default function DoctorDashboardScreen({ currentUser, onLogout, navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    totalPatients: 0,
    pendingCount: 0,
    completedCount: 0,
  });
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch appointments for this doctor via their Doctor profile
      const appointmentRes = await axiosInstance.get('/appointments/my-appointments/doctor');

      // Get today's date
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      // Filter today's appointments
      const todayAppts = (appointmentRes.data || []).filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= todayStart && aptDate < todayEnd;
      });

      setTodayAppointments(todayAppts);

      // Calculate statistics
      const allAppointments = appointmentRes.data || [];
      const pendingAppts = allAppointments.filter(
        (apt) => apt.status?.toLowerCase() === 'pending'
      );
      const completedAppts = allAppointments.filter(
        (apt) => apt.status?.toLowerCase() === 'completed'
      );

      // Get unique patients
      const uniquePatients = new Set(allAppointments.map((apt) => apt.patientId));

      setStats({
        todayCount: todayAppts.length,
        totalPatients: uniquePatients.size,
        pendingCount: pendingAppts.length,
        completedCount: completedAppts.length,
      });
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      setUpdatingId(appointmentId);
      await axiosInstance.put(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });

      // Refresh the data
      fetchData();
      Alert.alert('Success', `Appointment ${newStatus.toLowerCase()}`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = (id) => {
    Alert.alert('Confirm Appointment', 'Do you want to confirm this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => updateAppointmentStatus(id, 'Confirmed'),
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Cancel Appointment', 'Do you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => updateAppointmentStatus(id, 'Cancelled'),
      },
    ]);
  };

  const handleComplete = (id) => {
    Alert.alert('Mark as Complete', 'Do you want to mark this appointment as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => updateAppointmentStatus(id, 'Completed'),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.doctorName}>
                {currentUser?.name ? (currentUser.name.startsWith('Dr.') ? currentUser.name : `Dr. ${currentUser.name}`) : 'Doctor'}
              </Text>
            </View>
            {currentUser?.profilePhoto ? (
              <Image
                source={{ uri: currentUser.profilePhoto }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsGrid}>
          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#0077B6" />
            </View>
            <Text style={styles.cardValue}>{stats.todayCount}</Text>
            <Text style={styles.cardLabel}>Today&apos;s Appointments</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#F3E5F5' }]}>
              <MaterialCommunityIcons name="account-multiple" size={24} color="#7B1FA2" />
            </View>
            <Text style={styles.cardValue}>{stats.totalPatients}</Text>
            <Text style={styles.cardLabel}>Total Patients</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9500" />
            </View>
            <Text style={styles.cardValue}>{stats.pendingCount}</Text>
            <Text style={styles.cardLabel}>Pending</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#34C759" />
            </View>
            <Text style={styles.cardValue}>{stats.completedCount}</Text>
            <Text style={styles.cardLabel}>Completed</Text>
          </View>
        </View>

        {/* Today's Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Appointments</Text>
            <Text style={styles.appointmentCount}>{todayAppointments.length}</Text>
          </View>

          {todayAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D1D1" />
              <Text style={styles.emptyStateText}>No appointments today</Text>
              <Text style={styles.emptyStateSubtext}>You have a free day!</Text>
            </View>
          ) : (
            <View>
              {todayAppointments.map((appointment) => (
                <View key={appointment._id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.patientName}>
                        {appointment.patientName || 'Patient'}
                      </Text>
                      <Text style={styles.appointmentTime}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        {' '}{appointment.time || 'N/A'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status) },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {appointment.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {appointment.description && (
                    <Text style={styles.appointmentDesc}>{appointment.description}</Text>
                  )}

                  {appointment.status?.toLowerCase() === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.acceptBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleAccept(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Confirm</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.rejectBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleReject(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Cancel</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {appointment.status?.toLowerCase() === 'confirmed' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.completeBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleComplete(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Mark Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {appointment.status?.toLowerCase() === 'completed' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.prescriptionBtn]}
                        onPress={() => navigation.navigate('AddPrescription', { appointment })}
                      >
                        <Ionicons name="document-text" size={16} color="#FFF" />
                        <Text style={styles.actionBtnText}>Attach Prescription</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('AllAppointments')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>View All Appointments</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => Alert.alert('Info', 'Prescription feature coming soon')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>Add Prescription</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => Alert.alert('Info', 'Medical records feature coming soon')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="folder-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>View Medical Records</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  headerSection: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  logoutText: {
    marginLeft: 6,
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 16,
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0077B6',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  appointmentCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077B6',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
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
  appointmentDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#34C759',
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
  },
  completeBtn: {
    backgroundColor: '#0077B6',
  },
  prescriptionBtn: {
    backgroundColor: '#7B1FA2',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

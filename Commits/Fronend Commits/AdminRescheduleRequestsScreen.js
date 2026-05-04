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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

export default function AdminRescheduleRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/appointments/reschedule-requests');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load reschedule requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (id) => {
    Alert.alert(
      'Approve Reschedule',
      'Are you sure you want to approve this reschedule request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await axiosInstance.post(`/appointments/${id}/approve-reschedule`);
              Alert.alert('Success', 'Reschedule approved successfully');
              fetchRequests();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (id) => {
    Alert.alert(
      'Reject Reschedule',
      'Are you sure you want to reject this reschedule request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.post(`/appointments/${id}/reject-reschedule`);
              Alert.alert('Success', 'Reschedule request rejected');
              fetchRequests();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reject');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Requests</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchRequests();
            }}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D1D1" />
            <Text style={styles.emptyText}>No Pending Requests</Text>
            <Text style={styles.emptySubtext}>All reschedule requests have been processed.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => (
              <View key={req._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.patientName}>{req.patientName}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Pending</Text>
                  </View>
                </View>

                <Text style={styles.doctorName}>Doctor: {req.doctorId?.name}</Text>

                <View style={styles.infoBox}>
                  <Text style={styles.boxTitle}>Original Schedule</Text>
                  <Text style={styles.boxText}>
                    Date: {new Date(req.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.boxText}>Time: {req.time}</Text>
                </View>

                <View style={[styles.infoBox, styles.newBox]}>
                  <Text style={[styles.boxTitle, { color: '#D97700' }]}>Requested Schedule</Text>
                  <Text style={styles.boxText}>
                    Date: {new Date(req.rescheduleRequestedDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.boxText}>Time: {req.rescheduleRequestedTime}</Text>
                </View>

                <View style={styles.reasonBox}>
                  <Text style={styles.boxTitle}>Doctor&apos;s Reason:</Text>
                  <Text style={styles.boxText}>{req.rescheduleReason}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(req._id)}
                  >
                    <Ionicons name="close" size={16} color="#FF3B30" />
                    <Text style={[styles.btnText, { color: '#FF3B30' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(req._id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={[styles.btnText, { color: '#FFF' }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
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
    borderBottomColor: '#EFF3F6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderTopWidth: 4,
    borderTopColor: '#FF9500',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  badge: {
    backgroundColor: '#FFF8E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#D97700',
    fontSize: 12,
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  newBox: {
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#FFECC0',
  },
  reasonBox: {
    marginTop: 4,
    marginBottom: 16,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0DB591',
    backgroundColor: '#F2FAF8',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 4,
  },
  boxText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  approveBtn: {
    backgroundColor: '#0DB591',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

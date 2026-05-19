import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, ScrollView, TouchableOpacity, TextInput, 
  RefreshControl, Alert, Dimensions, Platform, Image, ActivityIndicator,
  Modal
} from 'react-native';
import { Text, Surface, ProgressBar } from 'react-native-paper';
import { 
  Search, Sliders, Calendar, MapPin, ChevronUp, ChevronDown, 
  CheckCircle, Plus, Map, Briefcase, PlayCircle, ShieldCheck, X
} from 'lucide-react-native';
import { taskApi } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Modal and form states for adding a new action plan
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium'); // low, medium, high
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskApi.getMy();
      if (res.data && res.data.success) {
        const list = res.data.tasks || [];
        setTasks(list);
        if (list.length > 0) {
          // Expand first task by default
          setExpandedId(list[0]._id || list[0].id);
        }
      }
    } catch (err) {
      console.log('⚠️ TasksScreen: Failed to fetch tasks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = async () => {
    setFetching(true);
    await fetchTasks();
    setFetching(false);
  };

  const handleAddAction = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for your action plan.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await taskApi.create({
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        dueDate: new Date().toISOString(), // Default to today
      });

      if (res.data && res.data.success) {
        Alert.alert('Success', 'Action plan added successfully!');
        setShowAddModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewPriority('medium');
        fetchTasks();
      }
    } catch (err) {
      console.log('⚠️ TasksScreen: Failed to add action:', err.message);
      Alert.alert('Error', 'Failed to create action plan. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, title, action) => {
    const targetStatus = action === 'complete' ? 'completed' : 'in-progress';
    Alert.alert(
      `${action === 'complete' ? 'Complete' : 'Update'} Task`,
      `Mark "${title}" as successfully ${action === 'complete' ? 'completed' : 'in progress'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              const res = await taskApi.updateStatus(id, targetStatus);
              if (res.data && res.data.success) {
                Alert.alert('Success', `Task marked as ${targetStatus}!`);
                fetchTasks();
              }
            } catch (err) {
              console.log('⚠️ TasksScreen: Failed to update status:', err.message);
              Alert.alert('Error', 'Failed to update task status.');
            }
          }
        }
      ]
    );
  };

  const filteredTasks = tasks.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic Performance Calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const progressRatio = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={fetching} onRefresh={onRefresh} colors={['#1d4ed8']} />
      }
    >
      {/* Rebranded title & Add Action button */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Daily Action Plan</Text>
          <Text style={styles.subtitle}>Manage your daily objectives and action items.</Text>
        </View>
        <TouchableOpacity 
          style={styles.addActionBtn} 
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addActionBtnText}>Add Action</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search actions..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={fetchTasks}>
          <Text style={styles.filterText}>Sync ↻</Text>
        </TouchableOpacity>
      </View>

      {/* Task Cards List */}
      {loading && !fetching ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>Loading action plan...</Text>
        </View>
      ) : (
        <View style={styles.tasksList}>
          {filteredTasks.length === 0 ? (
            <Surface style={{ backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }} elevation={1}>
              <Briefcase size={36} color="#94a3b8" />
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginTop: 14 }}>No Action Items</Text>
              <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                There are no active actions logged on your board. Press "Add Action" above to add your own daily action items!
              </Text>
            </Surface>
          ) : (
            filteredTasks.map((item) => {
              const isCompleted = item.status === 'completed';
              const taskId = item._id || item.id;
              const isExpanded = expandedId === taskId;
              
              return (
                <Surface key={taskId} style={[styles.taskCard, isCompleted && styles.taskCardCompleted]} elevation={1}>
                  <TouchableOpacity 
                    style={styles.cardHeaderToggle} 
                    onPress={() => setExpandedId(isExpanded ? null : taskId)}
                  >
                    <View style={styles.headerToggleLeft}>
                      <View style={isCompleted ? styles.statusBadgeCompleted : styles.statusBadgeInProgress}>
                        <Text style={isCompleted ? styles.statusBadgeTextCompleted : styles.statusBadgeTextInProgress}>
                          {isCompleted ? 'Completed' : 'In Progress'}
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, isCompleted && styles.cardTitleCompleted]}>
                        {item.title}
                      </Text>
                    </View>
                    {isCompleted ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      isExpanded ? <ChevronUp size={18} color="#475569" /> : <ChevronDown size={18} color="#475569" />
                    )}
                  </TouchableOpacity>

                  {!isCompleted && isExpanded && (
                    <View style={styles.cardExpandedContent}>
                      <View style={styles.dateMetaRow}>
                        <Calendar size={14} color="#64748b" style={{ marginRight: 6 }} />
                        <Text style={styles.dateMetaText}>
                          Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : 'Immediate'}
                        </Text>
                      </View>

                      <Text style={styles.taskDescription}>{item.description}</Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                          style={styles.updateProgressBtn}
                          onPress={() => handleAction(taskId, item.title, 'update')}
                        >
                          <Text style={styles.updateProgressText}>Work on it</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.markCompleteBtn}
                          onPress={() => handleAction(taskId, item.title, 'complete')}
                        >
                          <CheckCircle size={16} color="#10b981" style={{ marginRight: 6 }} />
                          <Text style={styles.markCompleteText}>Mark Complete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {isCompleted && isExpanded && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                      <Text style={[styles.taskDescription, { color: '#64748b', textDecorationLine: 'line-through' }]}>
                        {item.description}
                      </Text>
                      <View style={styles.dateMetaRow}>
                        <Calendar size={14} color="#10b981" style={{ marginRight: 6 }} />
                        <Text style={[styles.dateMetaText, { color: '#10b981' }]}>
                          Completed
                        </Text>
                      </View>
                    </View>
                  )}
                </Surface>
              );
            })
          )}
        </View>
      )}

      {/* Daily Performance Dashboard Card */}
      <Surface style={styles.performanceCard} elevation={2}>
        <LinearGradient
          colors={['#002626', '#001a14']}
          style={styles.performanceGradient}
        >
          <Text style={styles.performanceLabel}>DAILY PERFORMANCE</Text>
          <View style={styles.performanceValueRow}>
            <Text style={styles.performanceValue}>{completionPercentage}%</Text>
            <Text style={styles.performanceTrend}>{completionPercentage > 60 ? '+12%' : '0%'}</Text>
          </View>
          
          <ProgressBar 
            progress={progressRatio} 
            color="#10b981" 
            style={styles.progressBar} 
          />
          <Text style={styles.performanceSummary}>
            {completedTasksCount} of {totalTasksCount} action items completed for today's operational goals.
          </Text>
        </LinearGradient>
      </Surface>

      {/* Ratios list */}
      <Surface style={styles.priorityCard} elevation={1}>
        <Text style={styles.priorityTitle}>Action Plan Summary</Text>
        
        <View style={styles.priorityRow}>
          <View style={styles.priorityLeft}>
            <View style={[styles.priorityDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.priorityLabel}>Pending Actions</Text>
          </View>
          <Text style={styles.priorityVal}>{inProgressTasksCount}</Text>
        </View>

        <View style={styles.priorityRow}>
          <View style={styles.priorityLeft}>
            <View style={[styles.priorityDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.priorityLabel}>Completed Actions</Text>
          </View>
          <Text style={styles.priorityVal}>{completedTasksCount}</Text>
        </View>

        <View style={[styles.priorityRow, { borderBottomWidth: 0 }]}>
          <View style={styles.priorityLeft}>
            <View style={[styles.priorityDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.priorityLabel}>Total Daily Actions</Text>
          </View>
          <Text style={styles.priorityVal}>{totalTasksCount}</Text>
        </View>
      </Surface>

      {/* Modal for Adding a New Action Plan */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Action Item</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Action Name / Objective *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Visit Apollo Hospital client"
                placeholderTextColor="#94a3b8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Detailed Plan / Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe what you plan to do..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={4}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.prioritySelectorRow}>
                {['low', 'medium', 'high'].map((p) => {
                  const isSelected = newPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.prioritySelectBtn,
                        isSelected && styles.prioritySelectBtnSelected,
                        isSelected && p === 'low' && styles.prioritySelectBtn_low,
                        isSelected && p === 'medium' && styles.prioritySelectBtn_medium,
                        isSelected && p === 'high' && styles.prioritySelectBtn_high
                      ]}
                      onPress={() => setNewPriority(p)}
                    >
                      <Text style={[
                        styles.prioritySelectText,
                        isSelected && styles.prioritySelectTextSelected
                      ]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitActionBtn}
                onPress={handleAddAction}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitActionBtnText}>Save to Action Plan</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Surface>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  addActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d3c', // Premium emerald/dark teal matching current design language
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#0a3d3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    width: '68%',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    height: 48,
    width: '28%',
  },
  filterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  tasksList: {
    marginBottom: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  taskCardCompleted: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  cardHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadgeInProgress: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  statusBadgeTextInProgress: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusBadgeCompleted: {
    backgroundColor: '#e6fbf2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  statusBadgeTextCompleted: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  cardTitleCompleted: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  cardExpandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  dateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  updateProgressBtn: {
    backgroundColor: '#0a3d3c',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  updateProgressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markCompleteBtn: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '48%',
    backgroundColor: '#fff',
  },
  markCompleteText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
  },
  performanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  performanceGradient: {
    padding: 18,
  },
  performanceLabel: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  performanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 12,
  },
  performanceValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  performanceTrend: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  performanceSummary: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
  priorityCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  priorityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priorityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  priorityLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  priorityVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  mapBannerCard: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  mapBannerBg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mapBannerBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    marginRight: 12,
  },
  mapBannerBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mapPlusBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#002626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#334155',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  prioritySelectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  prioritySelectBtnSelected: {
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  prioritySelectBtn_low: {
    backgroundColor: '#10b981',
  },
  prioritySelectBtn_medium: {
    backgroundColor: '#3b82f6',
  },
  prioritySelectBtn_high: {
    backgroundColor: '#ef4444',
  },
  prioritySelectText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  prioritySelectTextSelected: {
    color: '#fff',
  },
  submitActionBtn: {
    backgroundColor: '#0a3d3c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#0a3d3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  TextInput,
} from "react-native";
import { Text, Surface } from "react-native-paper";
import {
  Menu,
  Sun,
  Bell,
  Navigation,
  Users,
  Wallet,
  CheckCircle,
  ClipboardCheck,
  Calendar,
  UserPlus,
  Play,
  Square,
  ChevronRight,
  CircleDot,
  RefreshCw,
  Home,
  X,
} from "lucide-react-native";
import useLocationTracker from "../../hooks/useLocationTracker";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { dashboardApi, meetingApi, expenseApi, taskApi, leadAPI, getAvatarUrl, uploadAPI } from "../../services/api";
import { useSettings } from "../../context/SettingsContext";

const { width } = Dimensions.get("window");

export default function EmployeeDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isTracking, loading, startTracking, stopTracking } =
    useLocationTracker();
  const [currentDate, setCurrentDate] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  
  // Settings Hook
  const { theme, language, t } = useSettings();
  
  // Dynamic theme colors mapping
  const isDark = theme === "dark";
  const colors = {
    background: isDark ? "#0f172a" : "#f8fafc",
    surface: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    iconColor: isDark ? "#94a3b8" : "#334155",
  };
  
  // Notification states
  const [notificationItems, setNotificationItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Dynamic state hooks for actual data
  const [stats, setStats] = useState({
    distanceToday: "0.00",
    meetingCount: 0,
    expenseTotal: 0,
    status: "absent",
  });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSubmitting, setQuickTaskSubmitting] = useState(false);
  
  const isOffice = user?.department?.toLowerCase() === 'office';

  const fetchNotifications = async () => {
    try {
      const items = [];
      
      // 1. Fetch incomplete tasks
      const tasksRes = await taskApi.getMy();
      if (tasksRes.data && tasksRes.data.success) {
        const activeTasks = (tasksRes.data.tasks || []).filter(t => t.status !== 'completed');
        activeTasks.forEach(t => {
          items.push({
            id: t._id || t.id,
            type: 'task',
            title: `New Task: ${t.title}`,
            description: t.description || 'No description provided.',
            date: t.createdAt || t.dueDate || new Date(),
            original: t,
          });
        });
      }
      
      // 2. Fetch incomplete leads
      const leadsRes = await leadAPI.getAll();
      if (leadsRes.data && leadsRes.data.success) {
        const activeLeads = (leadsRes.data.leads || []).filter(l => l.status !== 'completed');
        activeLeads.forEach(l => {
          items.push({
            id: l._id || l.id,
            type: 'lead',
            title: `New Lead Assigned: ${l.name}`,
            description: `Contact: ${l.contactNo} | ${l.address}`,
            date: l.createdAt || new Date(),
            original: l,
          });
        });
      }
      
      // Sort items by date descending (newest first)
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setNotificationItems(items);
      setUnreadCount(items.length);
    } catch (err) {
      console.log('⚠️ Failed to fetch notifications:', err.message);
    }
  };

  // Set date format matching: "SUNDAY, 17 MAY"
  useEffect(() => {
    const date = new Date();
    const options = { weekday: "long", day: "numeric", month: "short" };
    setCurrentDate(date.toLocaleDateString("en-US", options).toUpperCase());
  }, []);

  // Fetch actual data from database
  const loadDashboardData = async () => {
    try {
      // 1. Fetch dashboard metrics
      const statsRes = await dashboardApi.getStats();
      if (statsRes.data && statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // 2. Fetch employee's recent meetings
      const meetingsRes = await meetingApi.getMy();
      if (meetingsRes.data && meetingsRes.data.success) {
        setRecentMeetings(meetingsRes.data.meetings || []);
      }

      // 3. Fetch employee's recent expenses
      const expensesRes = await expenseApi.getMy();
      if (expensesRes.data && expensesRes.data.success) {
        setRecentExpenses(expensesRes.data.expenses || []);
      }

      // 4. Fetch recent tasks
      const tasksRes = await taskApi.getMy();
      if (tasksRes.data && tasksRes.data.success) {
        setRecentTasks(tasksRes.data.tasks || []);
      }
    } catch (err) {
      console.log("⚠️ EmployeeDashboardScreen: Failed to fetch data:", err.message);
    }
  };

  useEffect(() => {
    loadDashboardData();
    fetchNotifications();
  }, [isTracking]);

  const handleQuickTaskSubmit = async () => {
    if (!quickTaskTitle.trim()) return;
    setQuickTaskSubmitting(true);
    try {
      const res = await taskApi.create({ title: quickTaskTitle.trim(), description: 'Daily task submitted from dashboard', priority: 'medium', dueDate: new Date().toISOString() });
      if (res.data && res.data.success) {
        setQuickTaskTitle('');
        loadDashboardData();
        Alert.alert('Success', 'Task submitted!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit task');
    } finally {
      setQuickTaskSubmitting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleClockToggle = async () => {
    if (isTracking) {
      Alert.alert(
        "Confirm Punch Out",
        "Are you sure you want to end your active operational tracking shift?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Punch Out",
            style: "destructive",
            onPress: async () => {
              const res = await stopTracking();
              if (res.success) {
                Alert.alert(
                  "Shift Ended",
                  `Punch out complete. Logged ${res.totalDistance?.toFixed(2) || 0} km traveled.`,
                );
                loadDashboardData();
              } else {
                Alert.alert(
                  "Error",
                  res.error || "Failed to stop tracking session.",
                );
              }
            },
          },
        ],
      );
    } else {
      try {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required to punch in.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.7,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return; // User cancelled
        }

        const selfieImage = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: selfieImage.uri,
          type: 'image/jpeg',
          name: `punchin_selfie_${Date.now()}.jpg`
        });
        formData.append('folder', '/crm-tracker/attendance');
        
        // We upload it to store the real image per user request
        const uploadRes = await uploadAPI.uploadImageFormData(formData);
        
        let selfieUrl = '';
        if (uploadRes.data && uploadRes.data.success) {
           selfieUrl = uploadRes.data.url;
        } else {
           Alert.alert("Upload Failed", "Failed to upload selfie, but proceeding...");
        }

        const res = await startTracking(selfieUrl);
        if (res.success) {
          Alert.alert(
            "Shift Started",
            "Selfie captured. You are now ON DUTY. Background GPS tracking initialized.",
          );
          loadDashboardData();
        } else {
          Alert.alert(
            "Failed to Start Shift",
            res.error || "Check permission permissions and try again.",
          );
        }
      } catch (err) {
        console.log('Error during punch in:', err);
        Alert.alert("Error", "Something went wrong during Punch-In.");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.headerIconBtn}
        >
          <Menu size={22} color={colors.iconColor} />
        </TouchableOpacity>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={styles.notificationIconBtn}
          >
            <Bell size={22} color={colors.iconColor} />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push("/(employee)/profile")}
            style={[styles.avatarPill, { overflow: 'hidden' }]}
          >
            {getAvatarUrl(user?.avatar) ? (
              <Image source={{ uri: getAvatarUrl(user.avatar) }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "S"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1d4ed8"]}
          />
        }
      >
        {/* 2. Welcome Profile Card */}
        <Surface style={styles.welcomeCard} elevation={4}>
          <LinearGradient
            colors={["#09545eff", "#023a3aff"]}
            style={styles.welcomeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.welcomeTopRow}>
              <View style={styles.welcomeLeftInfo}>
                <Text style={styles.dateLabel}>
                  {currentDate || "SUNDAY, 17 MAY"}
                </Text>
                <Text style={styles.welcomeText}>
                  {t('hiText')}, {user?.name || "saif"}! 👋
                </Text>
                <View style={styles.pillRow}>
                  <View style={styles.subPill}>
                    <Text style={styles.subPillText}>
                      {user?.role?.toUpperCase() || "FIELD SERVICES"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Profile image avatar on right */}
              <View style={styles.profileAvatarBox}>
                <View style={[styles.avatarImgContainer, { overflow: 'hidden' }]}>
                  {getAvatarUrl(user?.avatar) ? (
                    <Image source={{ uri: getAvatarUrl(user.avatar) }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={styles.avatarBigLetter}>
                      {user?.name?.charAt(0).toUpperCase() || "S"}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom status row */}
            {!isOffice && (
            <View style={styles.welcomeBottomRow}>
              <TouchableOpacity
                style={[styles.enableLocationBtn, { width: '100%', justifyContent: 'center', backgroundColor: isTracking ? '#ef4444' : '#10b981', paddingVertical: 12, borderRadius: 12 }]}
                onPress={handleClockToggle}
              >
                <Navigation size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.enableLocationText, { fontSize: 16, fontWeight: 'bold', color: '#fff' }]}>
                  {isTracking ? "PUNCH-OUT (STOP TRACKING)" : "PUNCH-IN (START SHIFT)"}
                </Text>
              </TouchableOpacity>
            </View>
            )}
          </LinearGradient>
        </Surface>

        {isOffice ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>Submit Daily Task</Text>
            </View>
            <Surface style={[styles.officeTaskInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
              <View style={styles.officeInputHeader}>
                <ClipboardCheck size={20} color="#0a3d3c" style={{marginRight: 8}}/>
                <Text style={[styles.officeInputTitle, { color: colors.text }]}>What are you working on today?</Text>
              </View>
              <TextInput
                style={[styles.officeTextInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="E.g. Preparing weekly HR report..."
                placeholderTextColor={colors.subText}
                value={quickTaskTitle}
                onChangeText={setQuickTaskTitle}
                multiline
              />
              <TouchableOpacity
                style={[styles.officeSubmitBtn, quickTaskTitle.trim() === '' && {opacity: 0.6}]}
                onPress={handleQuickTaskSubmit}
                disabled={quickTaskSubmitting || quickTaskTitle.trim() === ''}
              >
                <LinearGradient
                   colors={['#0a3d3c', '#062828']}
                   style={styles.officeSubmitGradient}
                >
                  {quickTaskSubmitting ? (
                     <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.officeSubmitText}>Submit Task</Text>
                      <ChevronRight size={16} color="#fff" style={{marginLeft: 6}}/>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Surface>

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>My Recent Tasks</Text>
              <TouchableOpacity onPress={() => router.push("/tasks")}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>
            {recentTasks.length === 0 ? (
              <Surface style={[styles.expenseCard, { justifyContent: 'center', paddingVertical: 24, backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <Text style={{ fontSize: 12, color: colors.subText, textAlign: 'center', width: '100%' }}>No tasks submitted yet.</Text>
              </Surface>
            ) : (
              recentTasks.slice(0, 5).map(task => {
                const isCompleted = task.status === 'completed';
                return (
                <Surface key={task._id || task.id} style={[styles.officeTaskItem, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                  <View style={styles.officeTaskLeft}>
                    <View style={[styles.officeTaskIconBadge, isCompleted ? {backgroundColor: 'rgba(16, 185, 129, 0.1)'} : {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
                       {isCompleted ? <CheckCircle size={18} color="#10b981" /> : <Calendar size={18} color="#3b82f6" />}
                    </View>
                    <View style={styles.officeTaskContent}>
                      <Text style={[styles.officeTaskTitle, { color: colors.text }, isCompleted && {textDecorationLine: 'line-through', color: colors.subText}]} numberOfLines={2}>
                        {task.title}
                      </Text>
                      <Text style={[styles.officeTaskDate, { color: colors.subText }]}>
                        {new Date(task.createdAt || task.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.officeTaskStatus, isCompleted ? {backgroundColor: 'rgba(16, 185, 129, 0.15)'} : {backgroundColor: 'rgba(245, 158, 11, 0.15)'}]}>
                    <Text style={[styles.officeTaskStatusText, isCompleted ? {color: '#10b981'} : {color: '#f59e0b'}]}>
                      {task.status?.toUpperCase() || 'PENDING'}
                    </Text>
                  </View>
                </Surface>
              )})
            )}
          </>
        ) : (
          <>
            {/* 3. KPI Grid (2x2) */}
            <View style={styles.kpiGrid}>
              {/* Box 1: Distance & Rate */}
              <Surface style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.subText }]}>{t('distanceToday')}</Text>
                  <Navigation size={18} color="#00b4d8" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>
                  {stats?.distanceToday || "0.00"} km
                </Text>
              </Surface>

              {/* Box 2: Meetings */}
              <Surface style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.subText }]}>{t('meetings')}</Text>
                  <Users size={18} color="#a855f7" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{stats?.meetingCount || 0}</Text>
              </Surface>

              {/* Box 3: Total Distance */}
              <Surface style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.subText }]}>TOTAL DISTANCE</Text>
                  <Navigation size={18} color="#00b4d8" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{stats?.totalDistanceAllDates || "0.00"} km</Text>
              </Surface>

              {/* Box 4: Travel Rate */}
              <Surface style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.subText }]}>TRAVEL RATE</Text>
                  <Wallet size={18} color="#f59e0b" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>₹{stats?.travelRate || 0}/km</Text>
              </Surface>
            </View>

            {/* 4. Quick Operations */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickOperations')}</Text>
            <View style={styles.operationsGrid}>
              {/* Start/Stop Tracking */}
               <TouchableOpacity
                style={styles.opBtnWrapper}
                onPress={() => router.push("/tracking")}
              >
                <LinearGradient
                  colors={["#075555ff", "#044d6eff"]}
                  style={styles.opBtn}
                >
                  <Play size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.opBtnText, { color: colors.text }]}>{t('tracking')}</Text>
              </TouchableOpacity>


              {/* My Tasks */}
              <TouchableOpacity
                style={styles.opBtnWrapper}
                onPress={() => router.push("/tasks")}
              >
                <LinearGradient
                  colors={["#2563eb", "#1d4ed8"]}
                  style={styles.opBtn}
                >
                  <ClipboardCheck size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.opBtnText, { color: colors.text }]}>{t('actionPlan').toUpperCase()}</Text>
              </TouchableOpacity>

              {/* Apply Leave */}
              <TouchableOpacity
                style={styles.opBtnWrapper}
                onPress={() => router.push("/leaves")}
              >
                <LinearGradient
                  colors={["#059669", "#047857"]}
                  style={styles.opBtn}
                >
                  <Calendar size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.opBtnText, { color: colors.text }]}>{t('applyLeave')}</Text>
              </TouchableOpacity>

              {/* Add Meeting */}
              <TouchableOpacity
                style={styles.opBtnWrapper}
                onPress={() => router.push("/meetings")}
              >
                <LinearGradient
                  colors={["#7c3aed", "#6d28d9"]}
                  style={styles.opBtn}
                >
                  <UserPlus size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.opBtnText, { color: colors.text }]}>{t('addMeeting')}</Text>
              </TouchableOpacity>

              {/* Add Expense */}
              <TouchableOpacity
                style={styles.opBtnWrapper}
                onPress={() => router.push("/expenses")}
              >
                <LinearGradient
                  colors={["#ea580c", "#c2410c"]}
                  style={styles.opBtn}
                >
                  <Wallet size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.opBtnText, { color: colors.text }]}>{t('addExpense')}</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Recent Meetings */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentMeetings')}</Text>
              <TouchableOpacity onPress={() => router.push("/meetings")}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>

            {recentMeetings.length === 0 ? (
              <Surface style={[styles.meetingCard, { justifyContent: 'center', paddingVertical: 24, backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                <Text style={{ fontSize: 12, color: colors.subText, textAlign: 'center', width: '100%' }}>No meetings logged yet.</Text>
              </Surface>
            ) : (
              recentMeetings.slice(0, 3).map((meeting) => (
                <Surface key={meeting._id || meeting.id} style={[styles.meetingCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                  <View style={styles.meetingAvatar}>
                    <Text style={styles.meetingAvatarText}>
                      {meeting.clientName?.charAt(0).toUpperCase() || "C"}
                    </Text>
                  </View>
                  <View style={styles.meetingInfo}>
                    <Text style={[styles.meetingAgentName, { color: colors.text }]}>{meeting.clientName}</Text>
                    <Text style={[styles.meetingAgentSub, { color: colors.subText }]}>
                      {meeting.meetingNotes ? meeting.meetingNotes.substring(0, 32) + "..." : "No visit feedback notes logged"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.meetingBadge,
                      meeting.status === "completed" && { backgroundColor: "rgba(16, 185, 129, 0.15)" },
                      meeting.status === "follow-up" && { backgroundColor: "rgba(59, 130, 246, 0.15)" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.meetingBadgeText,
                        meeting.status === "completed" && { color: "#10b981" },
                        meeting.status === "follow-up" && { color: "#2563eb" },
                      ]}
                    >
                      {meeting.status?.toUpperCase() || "PENDING"}
                    </Text>
                  </View>
                </Surface>
              ))
            )}

            {/* 6. Recent Expenses */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentExpenses')}</Text>
              <TouchableOpacity onPress={() => router.push("/(employee)/expenses")}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.expenseList}>
              {recentExpenses.length === 0 ? (
                <Surface style={[styles.expenseCard, { justifyContent: 'center', paddingVertical: 24, backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                  <Text style={{ fontSize: 12, color: colors.subText, textAlign: 'center', width: '100%' }}>No expenses claimed yet.</Text>
                </Surface>
              ) : (
                recentExpenses.slice(0, 3).map((expense) => (
                  <Surface key={expense._id || expense.id} style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                    <View style={styles.expenseLeft}>
                      <View style={[styles.expenseIconBox, expense.status === "approved" && { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                        <Wallet
                          size={18}
                          color={expense.status === "approved" ? "#10b981" : "#f59e0b"}
                        />
                      </View>
                      <View style={styles.expenseInfo}>
                        <Text style={[styles.expenseName, { color: colors.text }]}>
                          {expense.category ? expense.category.toUpperCase() : "ALLOWANCE"}
                        </Text>
                        <Text style={[styles.expenseDate, { color: colors.subText }]}>
                          {expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : "Today"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={[styles.expenseValue, { color: colors.text }]}>₹{expense.amount}</Text>
                      <View
                        style={[
                          styles.approvedBadge,
                          expense.status === "pending" && { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                          expense.status === "rejected" && { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.approvedBadgeText,
                            expense.status === "pending" && { color: "#f59e0b" },
                            expense.status === "rejected" && { color: "#ef4444" },
                          ]}
                        >
                          {expense.status?.toUpperCase() || "PENDING"}
                        </Text>
                      </View>
                    </View>
                  </Surface>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 7. Notifications Modal */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.notificationOverlay}>
          <TouchableOpacity 
            style={styles.notificationDismissArea} 
            activeOpacity={1} 
            onPress={() => setShowNotifications(false)} 
          />
          
          <Surface style={[styles.notificationPanel, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={5}>
            <View style={[styles.notificationHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.notificationHeaderLeft}>
                <Bell size={20} color="#008080" />
                <Text style={[styles.notificationTitleText, { color: colors.text }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeNotifBtn}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={[styles.notificationListScroll, { backgroundColor: colors.background }]}
              showsVerticalScrollIndicator={false}
            >
              {notificationItems.length === 0 ? (
                <View style={styles.emptyNotificationView}>
                  <Bell size={32} color="#94a3b8" />
                  <Text style={[styles.emptyNotificationText, { color: colors.text }]}>All caught up!</Text>
                  <Text style={[styles.emptyNotificationSubtext, { color: colors.subText }]}>No pending tasks or leads assigned by admin.</Text>
                </View>
              ) : (
                notificationItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notificationItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setShowNotifications(false);
                      if (item.type === 'task') {
                        router.push('/tasks');
                      } else {
                        router.push('/leads');
                      }
                    }}
                  >
                    <View style={styles.notificationItemHeader}>
                      <View style={[styles.notificationTypeIndicator, { backgroundColor: item.type === 'task' ? '#eff6ff' : '#ecfdf5' }]}>
                        <Text style={[styles.notificationTypeText, { color: item.type === 'task' ? '#2563eb' : '#10b981' }]}>
                          {item.type.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.notificationItemTime, { color: colors.subText }]}>
                        {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={[styles.notificationItemTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.notificationItemDesc, { color: colors.subText }]}>{item.description}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Surface>
        </View>
      </Modal>

      {/* Slide sidebar navigation Drawer Modal (Premium custom "all action" implementation) */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.menuOverlay}>
          {/* Transparent left part to tap and close */}
          <TouchableOpacity 
            style={styles.menuDismissArea} 
            activeOpacity={1} 
            onPress={() => setShowMenu(false)} 
          />
          
          <Surface style={styles.menuPanel} elevation={5}>
            <LinearGradient
              colors={['#0a3d3c', '#002626']}
              style={styles.menuGradient}
            >
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuUserPill}>
                  <View style={[styles.menuUserAvatar, { overflow: 'hidden' }]}>
                    {getAvatarUrl(user?.avatar) ? (
                      <Image source={{ uri: getAvatarUrl(user.avatar) }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Text style={styles.menuAvatarTextInside}>
                        {user?.name?.charAt(0).toUpperCase() || "S"}
                      </Text>
                    )}
                  </View>
                  <View style={styles.menuUserInfo}>
                    <Text style={styles.menuUserName} numberOfLines={1}>{user?.name || "sikandar Ali"}</Text>
                    <Text style={styles.menuUserRole}>{user?.role?.toUpperCase() || "EMPLOYEE"}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowMenu(false)} style={styles.menuCloseBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Menu Items List */}
              <ScrollView style={styles.menuItemsScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.menuSectionTitle}>NAVIGATION</Text>
                
                {[
                  { label: 'Dashboard', route: '/', icon: 'Home', desc: 'Main control center' },
                  { label: 'Daily Action Plan', route: '/tasks', icon: 'ClipboardCheck', desc: 'View & add daily actions' },
                  { label: 'Live GPS Tracking', route: '/tracking', icon: 'Navigation', desc: 'Realtime speed & distance' },
                  { label: 'Client Meetings', route: '/meetings', icon: 'Users', desc: 'Log feedback & visit details' },
                  { label: 'Expenses & Claims', route: '/expenses', icon: 'Wallet', desc: 'Submit logs & receipt uploads' },
                  { label: 'Leaves & Attendance', route: '/leaves', icon: 'Calendar', desc: 'Request leave sessions' },
                  { label: 'My Profile', route: '/(employee)/profile', icon: 'UserCircle', desc: 'Account details' },
                ].map((item) => {
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.menuItemBtn}
                      onPress={() => {
                        setShowMenu(false);
                        router.push(item.route);
                      }}
                    >
                      <View style={styles.menuItemIconBox}>
                        {/* We render the corresponding icon */}
                        {item.icon === 'Home' && <Home size={18} color="#fff" />}
                        {item.icon === 'ClipboardCheck' && <ClipboardCheck size={18} color="#fff" />}
                        {item.icon === 'Navigation' && <Navigation size={18} color="#fff" />}
                        {item.icon === 'Users' && <Users size={18} color="#fff" />}
                        {item.icon === 'Wallet' && <Wallet size={18} color="#fff" />}
                        {item.icon === 'Calendar' && <Calendar size={18} color="#fff" />}
                        {item.icon === 'UserCircle' && <UserPlus size={18} color="#fff" />}
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemLabel}>{item.label}</Text>
                        <Text style={styles.menuItemSub}>{item.desc}</Text>
                      </View>
                      <ChevronRight size={14} color="#52525b" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}>FieldTrack Pro • v1.4.2</Text>
              </View>
            </LinearGradient>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Very clean premium light background
  },
  TextInput: {
    borderWidth: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 44   : 37,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff", // Clean white background
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0", // Soft grey border
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9", // Light grey button backing
    justifyContent: "center",
    alignItems: "center",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  redBadgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  avatarPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0a3d3c", // Forest Teal brand color for avatar
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#008080",
  },
  avatarText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeGradient: {
    padding: 22,
  },
  welcomeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  welcomeLeftInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#cbd5e1",
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 6,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  subPill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  profileAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImgContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBigLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  welcomeBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 24,
  },
  menuThemeText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  menuThemeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuThemeToggleText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 6,
  },
  officeTaskInputCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  officeInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  officeInputTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  officeTextInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  officeSubmitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  officeSubmitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  officeSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  officeTaskItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  officeTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  officeTaskIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  officeTaskContent: {
    flex: 1,
  },
  officeTaskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  officeTaskDate: {
    fontSize: 11,
  },
  officeTaskStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  officeTaskStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  enableLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  enableLocationText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "bold",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: "#ffffff", // White card
    borderRadius: 16,
    padding: 16,
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0", // Soft grey border
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#64748b", // Slate grey
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a", // Dark text
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#475569", // Dark grey for visibility
    letterSpacing: 0.8,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  operationsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  opBtnWrapper: {
    alignItems: "center",
    width: "18%",
  },
  opBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  opBtnText: {
    color: "#475569", // Darker gray for light theme readability
    fontSize: 8.5,
    fontWeight: "bold",
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#00b4d8",
  },
  meetingCard: {
    backgroundColor: "#ffffff", // White card
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  meetingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9", // Light background
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  meetingAvatarText: {
    color: "#00b4d8",
    fontWeight: "bold",
    fontSize: 14,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingAgentName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a", // Dark text
  },
  meetingAgentSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  meetingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  meetingBadgeText: {
    color: "#f59e0b",
    fontSize: 9,
    fontWeight: "bold",
  },
  expenseList: {
    gap: 10,
  },
  expenseCard: {
    backgroundColor: "#ffffff", // White card
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseInfo: {
    justifyContent: "center",
  },
  expenseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a", // Dark text
  },
  expenseDate: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a", // Dark text
    marginBottom: 4,
  },
  approvedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  approvedBadgeText: {
    color: "#10b981",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    flexDirection: "row",
  },
  menuDismissArea: {
    flex: 1,
  },
  menuPanel: {
    width: width * 0.82,
    height: "100%",
    backgroundColor: "#18181b",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuGradient: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 44,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  menuUserPill: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  menuUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00b4d8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuAvatarTextInside: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  menuUserRole: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 2,
  },
  menuCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#1e293b",
  },
  menuItemsScroll: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    letterSpacing: 1.2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  menuItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  menuItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  menuItemSub: {
    color: "#64748b",
    fontSize: 9,
    marginTop: 1,
  },
  menuFooter: {
    padding: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  menuFooterText: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "bold",
  },
  notificationIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  notificationOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notificationDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  notificationPanel: {
    width: width * 0.9,
    maxHeight: "75%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  notificationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  headerBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  closeNotifBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  notificationListScroll: {
    padding: 16,
  },
  emptyNotificationView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyNotificationText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 12,
  },
  emptyNotificationSubtext: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  notificationItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notificationItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  notificationTypeIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notificationTypeText: {
    fontSize: 8.5,
    fontWeight: "bold",
  },
  notificationItemTime: {
    fontSize: 10,
    color: "#94a3b8",
  },
  notificationItemTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  notificationItemDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 15,
  },
});

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, ScrollView, TouchableOpacity, Alert, Switch, Dimensions, Platform 
} from 'react-native';
import { Text, Avatar, Surface, ActivityIndicator } from 'react-native-paper';
import { 
  CheckCircle2, Gauge, Award, Bell, Sun, Globe, LogOut, 
  ChevronRight, Pencil, ClipboardCheck, Calendar, Wallet, FileSpreadsheet 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { taskApi, expenseApi, uploadAPI, authAPI, getAvatarUrl } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Settings Context values
  const { theme, toggleTheme, language, changeLanguage, t } = useSettings();
  
  // Dynamic stats states
  const [taskStats, setTaskStats] = useState({ completed: 0, total: 0 });
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Theme Dynamic Colors
  const isDark = theme === 'dark';
  const colors = {
    background: isDark ? '#0f172a' : '#f8fafc',
    surface: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    iconColor: isDark ? '#94a3b8' : '#334155',
  };

  const currentThemeLabel = theme === 'dark' 
    ? (language === 'en' ? 'Current: Dark Mode' : 'वर्तमान: डार्क मोड') 
    : (language === 'en' ? 'Current: Light Mode' : 'वर्तमान: लाइट मोड');

  const fetchProfileStats = async () => {
    try {
      setLoadingStats(true);
      const taskRes = await taskApi.getMy();
      if (taskRes.data && taskRes.data.success) {
        const list = taskRes.data.tasks || [];
        const completed = list.filter(t => t.status === 'completed').length;
        setTaskStats({ completed, total: list.length });
      }

      const expenseRes = await expenseApi.getMy();
      if (expenseRes.data && expenseRes.data.success) {
        const list = expenseRes.data.expenses || [];
        const approvedTotal = list
          .filter(e => e.status === 'approved')
          .reduce((acc, e) => acc + e.amount, 0);
        setExpenseTotal(approvedTotal);
      }
    } catch (err) {
      console.log('⚠️ ProfileScreen: Failed to fetch profile stats:', err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const handleSelectImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // 1. Prepare base64
        const localUri = selectedAsset.uri;
        const filename = localUri.split('/').pop() || 'avatar.jpg';

        setUploading(true);

        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(selectedAsset.uri);
          const blob = await response.blob();
          formData.append('image', blob, filename);
        } else {
          formData.append('image', {
            uri: selectedAsset.uri,
            type: 'image/jpeg',
            name: filename
          });
        }

        const uploadRes = await uploadAPI.uploadImageFormData(formData);

        if (uploadRes.data && uploadRes.data.success) {
          const imageUrl = uploadRes.data.url;
          
          // 2. Update user profile with new avatar URL
          const updateRes = await authAPI.updateProfile({ avatar: imageUrl });
          if (updateRes.data && updateRes.data.success) {
            // Update auth context / user info
            await updateUser(updateRes.data.user);
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        }
      }
    } catch (e) {
      console.log('Image upload error:', e.message);
      Alert.alert('Error', 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleLanguageChange = () => {
    if (Platform.OS === 'web') {
      const lang = window.confirm('Select Language:\nOK for English, Cancel for Hindi');
      changeLanguage(lang ? 'en' : 'hi');
    } else {
      Alert.alert(
        t('regionLanguage'),
        'Select App Language / भाषा चुनें',
        [
          { text: 'English', onPress: () => changeLanguage('en') },
          { text: 'हिंदी (Hindi)', onPress: () => changeLanguage('hi') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleLogout = () => {
    const confirmationText = language === 'en' ? 'Are you sure you want to exit StaffSync?' : 'क्या आप सच में StaffSync से बाहर निकलना चाहते हैं?';
    const titleText = language === 'en' ? 'Confirm Logout' : 'लॉगआउट की पुष्टि करें';
    const logoutBtnText = language === 'en' ? 'Logout' : 'लॉगआउट';
    const cancelBtnText = language === 'en' ? 'Cancel' : 'रद्द करें';

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm(confirmationText);
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert(
        titleText,
        confirmationText,
        [
          { text: cancelBtnText, style: 'cancel' },
          { text: logoutBtnText, style: 'destructive', onPress: logout }
        ]
      );
    }
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'FT';
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const efficiencyRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 100;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      
      {/* 1. Header Profile Box */}
      <View style={styles.profileHeaderBox}>
        <View style={styles.avatarWrapper}>
          {uploading ? (
            <View style={[styles.avatar, { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 3, borderColor: '#fff' }]}>
              <ActivityIndicator size="small" color="#0a3d3c" />
            </View>
          ) : getAvatarUrl(user?.avatar) ? (
            <Avatar.Image 
              size={96} 
              source={{ uri: getAvatarUrl(user.avatar) }} 
              style={styles.avatar} 
            />
          ) : (
            <Avatar.Text 
              size={96} 
              label={getInitials(user?.name)} 
              style={styles.avatar} 
              labelStyle={styles.avatarLabel} 
            />
          )}
          <TouchableOpacity style={styles.editIconBtn} onPress={handleSelectImage}>
            <Pencil size={12} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'Field Operative'}</Text>
        <Text style={[styles.profileTitle, { color: colors.subText }]}>{user?.email || 'field@crm.com'} • {user?.phone || 'No phone logged'}</Text>
        
        <View style={[styles.deptBadge, isDark && { backgroundColor: '#334155' }]}>
          <Text style={[styles.deptBadgeText, isDark && { color: '#f8fafc' }]}>ROLE: {user?.role?.toUpperCase() || 'FIELD OPERATIONS'}</Text>
        </View>
      </View>

      {/* 2. Side-by-Side Metrics Cards */}
      <View style={styles.metricsRow}>
        
        {/* Metric 1: Tasks Completed */}
        <Surface style={[styles.metricCard, { borderLeftColor: '#10b981', backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: colors.subText }]}>{t('tasksCompleted')}</Text>
            <CheckCircle2 size={18} color="#10b981" />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>{taskStats.completed}</Text>
          <Text style={styles.metricTrendGreen}>{taskStats.total} Total Assigned</Text>
        </Surface>

        {/* Metric 2: Efficiency */}
        <Surface style={[styles.metricCard, { borderLeftColor: '#002626', backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: colors.subText }]}>{t('efficiency')}</Text>
            <Gauge size={18} color="#008080" />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>{efficiencyRate}%</Text>
          <Text style={[styles.metricTrendGrey, { color: colors.subText }]}>Completion Quotient</Text>
        </Surface>
      </View>

      {/* 3. Elite Operative Rank Banner Ribbon */}
      <Surface style={styles.rankBanner} elevation={2}>
        <View style={styles.rankInfo}>
          <Text style={styles.rankLabel}>{t('currentRank')}</Text>
          <Text style={styles.rankTitle}>
            {taskStats.completed >= 5 ? t('eliteOperative') : t('activeFieldAgent')}
          </Text>
        </View>
        <Award size={36} color="rgba(255,255,255,0.18)" style={styles.rankIcon} />
      </Surface>

      {/* 4. Employee Services Command Hub */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('employeeCommandHub')}</Text>
      <View style={styles.hubGrid}>
        
        {/* Hub Item 1: Action Plan / Tasks */}
        <TouchableOpacity style={[styles.hubItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(employee)/tasks')}>
          <View style={[styles.hubIconContainer, { backgroundColor: '#e0f2fe' }]}>
            <ClipboardCheck size={22} color="#0284c7" />
          </View>
          <Text style={[styles.hubLabel, { color: colors.text }]}>{t('actionPlan')}</Text>
          <Text style={[styles.hubSub, { color: colors.subText }]}>{t('workPlan')}</Text>
        </TouchableOpacity>

        {/* Hub Item 2: Meetings */}
        <TouchableOpacity style={[styles.hubItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(employee)/meetings')}>
          <View style={[styles.hubIconContainer, { backgroundColor: '#fef3c7' }]}>
            <Calendar size={22} color="#d97706" />
          </View>
          <Text style={[styles.hubLabel, { color: colors.text }]}>{t('meetings')}</Text>
          <Text style={[styles.hubSub, { color: colors.subText }]}>{t('clientVisits')}</Text>
        </TouchableOpacity>

        {/* Hub Item 3: Expenses Claims */}
        <TouchableOpacity style={[styles.hubItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(employee)/expenses')}>
          <View style={[styles.hubIconContainer, { backgroundColor: '#dcfce7' }]}>
            <Wallet size={22} color="#15803d" />
          </View>
          <Text style={[styles.hubLabel, { color: colors.text }]}>{t('expenses')}</Text>
          <Text style={[styles.hubSub, { color: colors.subText }]}>{t('claimPayouts')}</Text>
        </TouchableOpacity>

        {/* Hub Item 4: Leaves Requests */}
        <TouchableOpacity style={[styles.hubItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(employee)/leaves')}>
          <View style={[styles.hubIconContainer, { backgroundColor: '#f3e8ff' }]}>
            <FileSpreadsheet size={22} color="#7e22ce" />
          </View>
          <Text style={[styles.hubLabel, { color: colors.text }]}>{t('leaveRequest')}</Text>
          <Text style={[styles.hubSub, { color: colors.subText }]}>{t('applyTimeOff')}</Text>
        </TouchableOpacity>

      </View>

      {/* 4. Application Settings Box */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('applicationSettings')}</Text>
      <Surface style={[styles.settingsSurface, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
        
        {/* Settings Item 1: Push Notifications */}
        <View style={[styles.settingsRow, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
          <Bell size={20} color={colors.iconColor} style={{ marginRight: 14 }} />
          <View style={styles.settingsTextCol}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('pushNotifications')}</Text>
            <Text style={[styles.settingsSub, { color: colors.subText }]}>{t('taskUpdates')}</Text>
          </View>
          <Switch 
            value={pushEnabled} 
            onValueChange={setPushEnabled}
            trackColor={{ false: '#cbd5e1', true: '#1d4ed8' }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          />
        </View>

        {/* Settings Item 2: Appearance */}
        <TouchableOpacity style={[styles.settingsRow, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]} onPress={toggleTheme}>
          <Sun size={20} color={colors.iconColor} style={{ marginRight: 14 }} />
          <View style={styles.settingsTextCol}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('appearance')}</Text>
            <Text style={[styles.settingsSub, { color: colors.subText }]}>{currentThemeLabel}</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Settings Item 3: Region & Language */}
        <TouchableOpacity style={[styles.settingsRow, { borderBottomWidth: 0 }]} onPress={handleLanguageChange}>
          <Globe size={20} color={colors.iconColor} style={{ marginRight: 14 }} />
          <View style={styles.settingsTextCol}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('regionLanguage')}</Text>
            <Text style={[styles.settingsSub, { color: colors.subText }]}>{language === 'en' ? 'English (US)' : 'हिंदी (IN)'}</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </Surface>

      {/* 5. Logout Button */}
      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.surface }]} onPress={handleLogout}>
        <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>{t('logout')}</Text>
      </TouchableOpacity>

      {/* Version subtitle */}
      <Text style={[styles.versionText, { color: colors.subText }]}>Version 4.2.0-pro build 882</Text>
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
    alignItems: 'center',
  },
  profileHeaderBox: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    paddingTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#0a3d3c',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
  },
  avatarLabel: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  editIconBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#002626',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  deptBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    height: 32,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    lineHeight: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 8,
  },
  metricTrendGreen: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricTrendGrey: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  rankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#002626',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
  },
  rankInfo: {
    flex: 1,
  },
  rankLabel: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rankTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  rankIcon: {
    opacity: 0.8,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsSurface: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingsTextCol: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  settingsSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  hubItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '48%',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  hubIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hubLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  hubSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
});

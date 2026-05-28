import React, { createContext, useContext, useState, useEffect } from 'react';
import { Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

// Configure how the OS should handle notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    // 1. Request native permissions and configure Android high-importance channel
    async function configureNativeNotifications() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('⚠️ Native Notifications: Permission denied.');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('crm-alerts', {
            name: 'CRM Activity Alerts',
            importance: Notifications.AndroidImportance.MAX, // Wakes up screen / shows heads-up banner
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0a3d3c',
            bypassDnd: true,
          });
        }
      } catch (err) {
        console.error('Failed to configure native notifications:', err);
      }
    }

    if (user) {
      configureNativeNotifications();
    }
  }, [user]);

  // 🔔 Helper to trigger both OS-level system alert and in-app banner
  const triggerSystemNotification = async ({ title, message, type, route, data }) => {
    // Trigger subtle local vibration
    try {
      Vibration.vibrate(100);
    } catch {}

    // 1. Show in-app banner
    setActiveNotification({
      title,
      message,
      type: type || 'default',
      data: data || {},
    });

    // 2. Trigger OS-Level Native System Notification (shows when screen is off, locked, or backgrounded!)
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          data: { route: route || '/(employee)/dashboard' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // instant trigger
      });
    } catch (err) {
      console.log('Error scheduling native notification:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveNotification(null);
      return;
    }

    // 📡 Listener for unified real-time notifications
    const handleSocketNotification = (notification) => {
      console.log('📡 Real-time notification received: ', notification);
      let route = '/(employee)/dashboard';
      if (notification.type === 'task') route = '/(employee)/tasks';
      if (notification.type === 'leave') route = '/(employee)/leaves';
      if (notification.type === 'expense') route = '/(employee)/expenses';
      if (notification.type === 'lead') route = '/(employee)/leads';

      triggerSystemNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        route,
        data: notification.data,
      });
    };

    // 📡 Fallback listener for 'new_task' event (Legacy Backends)
    const handleNewTask = ({ task }) => {
      console.log('📡 Legacy new_task event received: ', task);
      triggerSystemNotification({
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${task?.title || ''}`,
        type: 'task',
        route: '/(employee)/tasks',
        data: { taskId: task?._id }
      });
    };

    // 📡 Fallback listener for 'leave_status_update' event (Legacy Backends)
    const handleLeaveUpdate = ({ leaveId, status }) => {
      console.log('📡 Legacy leave_status_update event received: ', { leaveId, status });
      const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
      triggerSystemNotification({
        title: `Leave ${formattedStatus}`,
        message: `Your leave request has been ${status || 'updated'}.`,
        type: 'leave',
        route: '/(employee)/leaves',
        data: { leaveId }
      });
    };

    // 📡 Fallback listener for 'expense_status_update' event (Legacy Backends)
    const handleExpenseUpdate = ({ expenseId, status }) => {
      console.log('📡 Legacy expense_status_update event received: ', { expenseId, status });
      const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
      triggerSystemNotification({
        title: `Expense Claim ${formattedStatus}`,
        message: `Your expense claim has been ${status || 'updated'}.`,
        type: 'expense',
        route: '/(employee)/expenses',
        data: { expenseId }
      });
    };

    // 📡 Fallback listener for 'account_approved' event (Legacy Backends)
    const handleAccountApproved = ({ message }) => {
      console.log('📡 Legacy account_approved event received: ', message);
      triggerSystemNotification({
        title: 'Account Approved',
        message: message || 'Your account has been approved!',
        type: 'alert',
        route: '/(employee)/dashboard',
      });
    };

    // Register all socket event listeners
    socketService.on('notification', handleSocketNotification);
    socketService.on('new_task', handleNewTask);
    socketService.on('leave_status_update', handleLeaveUpdate);
    socketService.on('expense_status_update', handleExpenseUpdate);
    socketService.on('account_approved', handleAccountApproved);

    // 🧭 Listen to native system notification tap events (Redirection when screen is off/backgrounded!)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const route = response.notification.request.content.data?.route;
      if (route) {
        console.log(`🧭 Native Notification Tap: Redirecting to ${route}`);
        setTimeout(() => {
          try {
            router.push(route);
          } catch (err) {
            console.error('Failed to redirect from native tap:', err);
          }
        }, 300);
      }
    });

    return () => {
      socketService.off('notification', handleSocketNotification);
      socketService.off('new_task', handleNewTask);
      socketService.off('leave_status_update', handleLeaveUpdate);
      socketService.off('expense_status_update', handleExpenseUpdate);
      socketService.off('account_approved', handleAccountApproved);
      responseListener.remove();
    };
  }, [user]);

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ activeNotification, dismissNotification, showLocalNotification: triggerSystemNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

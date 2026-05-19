import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage';

const SettingsContext = createContext({});

const translations = {
  en: {
    dashboard: "Dashboard",
    tracking: "Tracking",
    leads: "Leads",
    profile: "Profile",
    hiText: "Hi",
    statusOnline: "STATUS: ONLINE",
    statusOffline: "STATUS: OFFLINE",
    enableLocation: "ENABLE LOCATION",
    stopGps: "STOP GPS",
    distanceToday: "DISTANCE TODAY",
    meetings: "MEETINGS",
    expenses: "EXPENSES",
    status: "STATUS",
    present: "Present",
    absent: "Absent",
    quickOperations: "QUICK OPERATIONS",
    actionPlan: "Action Plan",
    applyLeave: "APPLY LEAVE",
    addMeeting: "ADD MEETING",
    addExpense: "ADD EXPENSE",
    recentMeetings: "Recent Meetings",
    recentExpenses: "Recent Expenses",
    viewAll: "View All ›",
    tasksCompleted: "TASKS COMPLETED",
    efficiency: "EFFICIENCY",
    currentRank: "CURRENT RANK",
    activeFieldAgent: "Active Field Agent",
    eliteOperative: "Elite Operative",
    employeeCommandHub: "Employee Command Hub",
    applicationSettings: "Application Settings",
    pushNotifications: "Push Notifications",
    appearance: "Appearance",
    regionLanguage: "Region & Language",
    logout: "Logout from StaffSync",
    currentTheme: "Current: Light Mode",
    currentLang: "English (US)",
    workPlan: "Tasks & duties",
    clientVisits: "Client visits",
    claimPayouts: "Claim payouts",
    applyTimeOff: "Apply time-off",
    taskUpdates: "Task updates and team pings"
  },
  hi: {
    dashboard: "डैशबोर्ड",
    tracking: "ट्रैकिंग",
    leads: "लीड्स",
    profile: "प्रोफ़ाइल",
    hiText: "नमस्ते",
    statusOnline: "स्थिति: ऑनलाइन",
    statusOffline: "स्थिति: ऑफलाइन",
    enableLocation: "लोकेशन चालू करें",
    stopGps: "लोकेशन बंद करें",
    distanceToday: "आज की दूरी",
    meetings: "बैठकें",
    expenses: "खर्चे",
    status: "स्थिति",
    present: "उपस्थित",
    absent: "अनुपस्थित",
    quickOperations: "त्वरित संचालन",
    actionPlan: "कार्य योजना",
    applyLeave: "छुट्टी आवेदन",
    addMeeting: "बैठक जोड़ें",
    addExpense: "खर्चा जोड़ें",
    recentMeetings: "हाल की बैठकें",
    recentExpenses: "हाल के खर्चे",
    viewAll: "सभी देखें ›",
    tasksCompleted: "पूर्ण कार्य",
    efficiency: "कार्यकुशलता",
    currentRank: "वर्तमान रैंक",
    activeFieldAgent: "सक्रिय फील्ड एजेंट",
    eliteOperative: "उत्कृष्ट एजेंट",
    employeeCommandHub: "कर्मचारी कमांड हब",
    applicationSettings: "एप्लिकेशन सेटिंग्स",
    pushNotifications: "पुश नोटिफिकेशन",
    appearance: "थीम (दिखावट)",
    regionLanguage: "क्षेत्र और भाषा",
    logout: "लॉगआउट करें",
    currentTheme: "वर्तमान: लाइट मोड",
    currentLang: "हिंदी (IN)",
    workPlan: "कार्य और कर्तव्य",
    clientVisits: "ग्राहक से मुलाकात",
    claimPayouts: "खर्चों का भुगतान",
    applyTimeOff: "छुट्टी के लिए आवेदन",
    taskUpdates: "कार्य अपडेट और टीम सूचनाएं"
  }
};

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = await storage.getItem('appTheme');
      if (savedTheme) setTheme(savedTheme);
      
      const savedLang = await storage.getItem('appLanguage');
      if (savedLang) setLanguage(savedLang);
    } catch (e) {
      console.log('Failed to load settings:', e);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    await storage.setItem('appTheme', nextTheme);
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await storage.setItem('appLanguage', lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ theme, toggleTheme, language, changeLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

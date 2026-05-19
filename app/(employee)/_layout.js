import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View, Platform } from "react-native";
import {
  LayoutDashboard,
  Navigation,
  Users,
  ClipboardCheck,
  Calendar,
  Wallet,
  User,
} from "lucide-react-native";

export default function EmployeeLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0a3d3c", // Brand Forest Teal
          tabBarInactiveTintColor: "#64748b", // Slate 500
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "bold",
            marginTop: -4,
            marginBottom: Platform.OS === "ios" ? 4 : 15,
          },
          tabBarStyle: {
            height: Platform.OS === "ios" ? 96 : 99,
            paddingBottom: Platform.OS === "ios" ? 32 : 26,
            paddingTop: 8,
            backgroundColor: "#ffffff", // Pure white card color
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0", // Soft grey border
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tracking"
          options={{
            title: "Tracking",
            tabBarIcon: ({ color }) => <Navigation size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="leads"
          options={{
            title: "Leads",
            tabBarIcon: ({ color }) => <Users size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            href: null,
            title: "Action Plan",
            tabBarIcon: ({ color }) => (
              <ClipboardCheck size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="meetings"
          options={{
            href: null,
            title: "Meetings",
            tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            href: null,
            title: "Expenses",
            tabBarIcon: ({ color }) => <Wallet size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User size={20} color={color} />,
          }}
        />

        {/* hidden leaves screen node */}
        <Tabs.Screen name="leaves" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({});

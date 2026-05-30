import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform, Image } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Navigation } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplash({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Initial rapid fade-in and scale-up (200ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Pulse indicator loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Elegant micro-splash: Keep for 1200ms, then trigger rapid 200ms fade-out
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(onFinish);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0a3d3c', '#002626', '#001414']}
        style={styles.gradient}
      >
        <View style={styles.centerContainer}>
          {/* Pulsing Radar Ring Backgrounds */}
          <Animated.View 
            style={[
              styles.pulseCircle, 
              { transform: [{ scale: pulseAnim }], opacity: 0.15 }
            ]} 
          />
          <Animated.View 
            style={[
              styles.pulseCircle, 
              { 
                transform: [{ scale: Animated.multiply(pulseAnim, 0.7) }], 
                opacity: 0.25 
              }
            ]} 
          />

          {/* Logo Brand Container */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('../assets/logo.jpeg')} 
                style={styles.logoImage} 
              />
            </View>
            
            <Text style={styles.brandTitle}>kisanTeam</Text>
            <Text style={styles.brandSubtitle}>Shift Tracker & Location Intelligence</Text>
          </Animated.View>
        </View>

        {/* Powered By Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SECURE OPERATIONAL SYNC</Text>
          <View style={styles.indicatorContainer}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  pulseCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: '#14b8a6',
    backgroundColor: 'transparent',
  },
  logoWrapper: {
    shadowColor: '#14b8a6',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#fff', // Ensure logo stands out on dark gradient backings
  },
  brandTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 10,
  },
  brandSubtitle: {
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#14b8a6',
    width: 18,
  },
});

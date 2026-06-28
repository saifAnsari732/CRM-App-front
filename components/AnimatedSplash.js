import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplash({ onFinish }) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation for a premium feel
    Animated.sequence([
      Animated.delay(150),
      // 1. Logo elegantly drops in and fades
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 15,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]),
      // 2. Title slides up and fades in
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]),
      // 3. Subtitle fades in smoothly
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 4. Footer fades in
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // Indeterminate Progress Bar Animation
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();

    // Finish splash after 2.5 seconds and trigger exit transition
    const timer = setTimeout(() => {
      // 1. Fade out texts and footer first
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(footerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        // 2. Logo zooms in massively while fading out
        Animated.parallel([
          Animated.timing(logoScale, { 
            toValue: 20, // Scales up to 20x size
            duration: 400, 
            useNativeDriver: true 
          }),
          Animated.timing(logoOpacity, { 
            toValue: 0, 
            duration: 400, // Fades out during the zoom
            useNativeDriver: true 
          }),
        ]).start(onFinish);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#064e3b']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <View style={styles.centerContainer}>
          
          {/* Logo with clean styling (Removed buggy android elevation/shadow) */}
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], zIndex: 2 }}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('../assets/logo.jpeg')} 
                style={styles.logoImage} 
              />
            </View>
          </Animated.View>
          
          {/* Brand Title */}
          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
            <Text style={styles.brandTitle}>kisanTeam</Text>
          </Animated.View>
          
          {/* Brand Subtitle */}
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.brandSubtitle}>Shift Tracker & Location Intelligence</Text>
          </Animated.View>
        </View>

        {/* Footer with animated progress bar instead of dots */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.footerText}>SECURE OPERATIONAL SYNC</Text>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                {
                  transform: [{
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-60, 60]
                    })
                  }]
                }
              ]} 
            />
          </View>
        </Animated.View>

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#020617', // Fallback
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
    marginTop: -30, // Adjusts overall visual center
  },
  logoWrapper: {
    marginBottom: 25,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  logoImage: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    resizeMode: 'cover',
    backgroundColor: '#fff', 
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 15,
  },
  progressBarContainer: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    width: 20,
    height: '100%',
    backgroundColor: '#14b8a6', // Teal brand accent
    borderRadius: 2,
  },
});

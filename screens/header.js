import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DynamicHeader = ({ 
  title, 
  subtitle, 
  iconName, 
  userInfo, 
  slideAnim,
  colors = ['#1E3A8A', '#3B82F6', '#60A5FA']
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de pulsation pour l'icône
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animation de rotation pour l'anneau orbital
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={colors}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Éléments décoratifs d'arrière-plan */}
      <View style={styles.backgroundElements}>
        <View style={[styles.floatingCircle, styles.circle1]} />
        <View style={[styles.floatingCircle, styles.circle2]} />
        <View style={[styles.floatingCircle, styles.circle3]} />
      </View>

      <Animated.View 
        style={[
          styles.headerContent,
          {
            opacity: slideAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}
      >
        {/* Logo avec animations */}
        <View style={styles.logoContainer}>
          <Animated.View 
            style={[
              styles.orbitalRing,
              {
                transform: [{ rotate: rotateInterpolate }]
              }
            ]}
          >
            <View style={styles.orbitalDot} />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.graduationCapContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <MaterialCommunityIcons name="school" size={22} color="white" />
            <View style={styles.sparkle1} />
            <View style={styles.sparkle2} />
          </Animated.View>
        </View>

        {/* Titre avec effet sophistiqué */}
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.titleUnderline} />
        </View>
        
        <Text style={styles.headerSubtitle}>{subtitle}</Text>

      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerGradient: { 
    paddingTop: 35,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },

  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  floatingCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  circle1: {
    width: 60,
    height: 60,
    top: -15,
    right: -15,
  },

  circle2: {
    width: 40,
    height: 40,
    top: 30,
    left: -10,
  },

  circle3: {
    width: 30,
    height: 30,
    bottom: 10,
    right: 20,
  },

  headerContent: { 
    alignItems: 'center',
    zIndex: 1,
  },

  logoContainer: {
    position: 'relative',
    width: 55,
    height: 55,
    marginBottom: 12,
  },

  graduationCapContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 6.5,
    left: 6.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  orbitalRing: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },

  orbitalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    position: 'absolute',
    top: -3,
  },

  sparkle1: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    position: 'absolute',
    top: 8,
    right: 12,
  },

  sparkle2: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 10,
    left: 8,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },

  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  titleUnderline: {
    width: 50,
    height: 3,
    backgroundColor: '#F59E0B',
    marginTop: 4,
    borderRadius: 2,
  },

  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.3,
  },



  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },

  headerStatItem: { 
    alignItems: 'center',
    flex: 1,
  },

  userAvatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  userAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  statusIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  statusPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    top: -5,
    left: -5,
  },

  headerStatValue: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '700',
    marginBottom: 2,
  },

  headerStatLabel: { 
    color: 'rgba(255, 255, 255, 0.85)', 
    fontSize: 10, 
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  headerStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 18,
  },
});

export default DynamicHeader;
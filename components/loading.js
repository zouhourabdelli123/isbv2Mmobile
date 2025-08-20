import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const Loading = ({ onDismiss }) => {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  
  // Animations refs
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const orbitalAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Couleurs premium inspirées du logo IIT
  const iitBlue = '#1e3a8a';
  const iitGold = '#fbbf24';
  const iitLightBlue = '#3b82f6';
  const iitNavy = '#1e293b';
  const iitSilver = '#e2e8f0';

  useEffect(() => {
    if (!isVisible) return;

    // Animation d'entrée
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
      useNativeDriver: true
    }).start();

    // Animation de fondu
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true
    }).start();

    // Animation de rotation principale
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true
      })
    ).start();

    // Animation orbitale complexe
    Animated.loop(
      Animated.timing(orbitalAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    // Animation de pulsation sophistiquée
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    ).start();

    // Animation des anneaux
    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true
      })
    ).start();

    // Animation des particules
    Animated.loop(
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    // Animation séquentielle des points
    const dotAnimation = Animated.stagger(400, [
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim1, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          }),
          Animated.timing(dotAnim1, {
            toValue: 0,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim2, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          }),
          Animated.timing(dotAnim2, {
            toValue: 0,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim3, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          }),
          Animated.timing(dotAnim3, {
            toValue: 0,
            duration: 1000,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true
          })
        ])
      )
    ]);

    dotAnimation.start();
  }, [isVisible]);

  const handlePress = () => {
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 500,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true
    }).start(() => {
      setIsVisible(false);
      onDismiss && onDismiss();
    });
  };

  if (!isVisible) return null;

  // Interpolations
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const orbitalRotation = orbitalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15]
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8]
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.3, 0.8]
  });

  const particleRotation = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });

  return (
    <TouchableOpacity 
      style={[styles.overlay, { backgroundColor: colors.background }]}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        {/* Particules en arrière-plan */}
        <Animated.View style={[
          styles.particleContainer,
          { transform: [{ rotate: particleRotation }] }
        ]}>
          {[...Array(8)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.particle,
                {
                  backgroundColor: i % 2 === 0 ? iitGold : iitLightBlue,
                  transform: [
                    { rotate: `${i * 45}deg` },
                    { translateY: -80 }
                  ]
                }
              ]} 
            />
          ))}
        </Animated.View>

        {/* Anneaux de fond */}
        <Animated.View style={[
          styles.ring,
          {
            borderColor: iitSilver,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }
        ]} />
        
        <Animated.View style={[
          styles.ring,
          styles.ringSecondary,
          {
            borderColor: iitLightBlue,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          }
        ]} />

        {/* Conteneur principal */}
        <Animated.View style={[
          styles.mainContainer,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          }
        ]}>
          {/* Spinner principal */}
          <Animated.View style={[
            styles.spinnerContainer,
            { transform: [{ rotate: spin }] }
          ]}>
            <View style={[styles.spinnerBackground, { backgroundColor: iitBlue }]}>
              <ActivityIndicator 
                animating={true} 
                size="large" 
                color="white"
                style={styles.spinner}
              />
            </View>
          </Animated.View>

          {/* Éléments orbitaux multiples */}
          <Animated.View style={[
            styles.orbitalContainer,
            { transform: [{ rotate: orbitalRotation }] }
          ]}>
            <View style={[styles.orbitalDot, { backgroundColor: iitGold }]} />
            <View style={[styles.orbitalDot, styles.orbitalDot2, { backgroundColor: iitLightBlue }]} />
            <View style={[styles.orbitalDot, styles.orbitalDot3, { backgroundColor: iitGold }]} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[
          styles.textContainer,
          { opacity: fadeAnim }
        ]}>
          <Text style={[styles.mainText, { color: iitBlue }]}>
            IIT
          </Text>
       
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement en cours...
          </Text>
        </Animated.View>

        <Animated.View style={[
          styles.dotsContainer,
          { opacity: fadeAnim }
        ]}>
          <Animated.View style={[
            styles.dot, 
            { 
              backgroundColor: iitBlue,
              opacity: dotAnim1,
              transform: [{
                scale: dotAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.8]
                })
              }]
            }
          ]}>
            <View style={[styles.dotInner, { backgroundColor: 'white' }]} />
          </Animated.View>
          
          <Animated.View style={[
            styles.dot, 
            { 
              backgroundColor: iitGold,
              opacity: dotAnim2,
              transform: [{
                scale: dotAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.8]
                })
              }]
            }
          ]}>
            <View style={[styles.dotInner, { backgroundColor: 'white' }]} />
          </Animated.View>
          
          <Animated.View style={[
            styles.dot, 
            { 
              backgroundColor: iitLightBlue,
              opacity: dotAnim3,
              transform: [{
                scale: dotAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.8]
                })
              }]
            }
          ]}>
            <View style={[styles.dotInner, { backgroundColor: 'white' }]} />
          </Animated.View>
        </Animated.View>

  
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  particleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  ringSecondary: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
  },
  mainContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  spinnerContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  spinner: {
    width: 40,
    height: 40,
  },
  orbitalContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitalDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 0,
    left: '50%',
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  orbitalDot2: {
    transform: [{ rotate: '120deg' }],
    top: 104,
    left: 20,
  },
  orbitalDot3: {
    transform: [{ rotate: '240deg' }],
    top: 104,
    right: 20,
    left: 'auto',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  mainText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(30, 58, 138, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  tapInstruction: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  tapText: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});

export default Loading;
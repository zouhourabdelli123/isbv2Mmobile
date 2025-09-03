import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Header({ title, withBackButton = false }) {
  const navigation = useNavigation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [scaleValue] = useState(new Animated.Value(1));



  const fetchNotificationCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`https://isbadmin.tn/api/getNotifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const responseData = await response.json();

      if (!responseData || !Array.isArray(responseData.notifications)) {
        throw new Error('Invalid response structure');
      }

    } catch (error) {
      console.log('Error fetching notification count:', error.message);
    }
  };

  const handlePress = (callback) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#1E40AF', '#1E3A8A', '#1E2A5A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />

        {/* Effet Glass subtil */}
        <View style={styles.glassOverlay} />

        <View style={styles.content}>
          {/* Section gauche */}
          <View style={styles.leftSection}>
            {withBackButton && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePress(() => navigation.goBack())}
                activeOpacity={0.7}
              >
                <View style={styles.buttonContainer}>
                  <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePress(() => navigation.navigate('Home'))}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContainer}>
                <Ionicons name="home" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section centrale - Titre */}
          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Section droite */}
          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePress(() => navigation.navigate('Messagerie'))}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContainer}>
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePress(() => navigation.navigate('notifications'))}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContainer}>
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
               
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => handlePress(() => navigation.navigate('Profile'))}
              activeOpacity={0.7}
            >
              <View style={styles.profileContainer}>
                <Ionicons name="person-circle-outline" size={22} color="#FFFFFF" />
                <View style={styles.profileIndicator} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 100 : 80,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 25,
    paddingBottom: 12,
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
  },
  titleSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    position: 'relative',
  },
  buttonContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 3,
  },
  profileButton: {
    marginLeft: 4,
  },
  profileContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    elevation: 4,
    position: 'relative',
  },
  profileIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.4,
  },
  titleUnderline: {
    width: 50,
    height: 2,
    marginTop: 3,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

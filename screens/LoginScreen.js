import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  AppState
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL_APP } from '../api';
import messaging from '@react-native-firebase/messaging';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

let refreshInterval = null;
const REFRESH_TIME = 2 * 24 * 60 * 60 * 1000; // 2 jours = 2 × 24h × 60min × 60sec × 1000ms
let isRefreshing = false;
let failedRefreshCount = 0; // Compteur d'échecs consécutifs
const MAX_FAILED_ATTEMPTS = 3; // Nombre maximum d'échecs avant alerte

const ISB_COLORS = {
  primary: '#1e40af',
  secondary: '#f59e0b',
  accent: '#3b82f6',
  darkBlue: '#1e3a8a',
  lightBlue: '#60a5fa',
  ultraLight: '#dbeafe',
  darkOrange: '#d97706',
  lightOrange: '#fbbf24',
  ultraLightOrange: '#fef3c7',
  background: '#f8fafc',
  cardBg: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  textVeryLight: '#94a3b8',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  shadow: 'rgba(30, 64, 175, 0.12)',
  shadowHard: 'rgba(30, 64, 175, 0.25)',
  overlay: 'rgba(15, 23, 42, 0.4)',
  border: '#e2e8f0',
  borderActive: '#3b82f6',
  borderError: '#ef4444',
  borderSuccess: '#10b981',
};

// Fonction pour rafraîchir le token SANS déconnecter l'utilisateur
const refreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');

    if (!token) {
      console.log('⚠️ Token non trouvé - ignorer le rafraîchissement');
      return null;
    }

    console.log('🔄 Tentative de rafraîchissement du token...');

    const response = await fetch(`${BASE_URL_APP}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000, // Timeout de 10 secondes
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Ne pas traiter comme une erreur fatale
      if (response.status === 401) {
        console.log('⚠️ Token expiré mais session maintenue');
        failedRefreshCount++;
        
        // Seulement après plusieurs échecs, alerter l'utilisateur
        if (failedRefreshCount >= MAX_FAILED_ATTEMPTS) {
          console.log('⚠️ Plusieurs échecs de rafraîchissement détectés');
          // NE PAS déconnecter, juste informer
        }
        return null;
      }
      
      throw new Error(errorData.message || 'Erreur de rafraîchissement');
    }

    const data = await response.json();

    if (data.token) {
      // Sauvegarder le nouveau token
      await AsyncStorage.setItem('userToken', data.token);
      console.log('✅ Nouveau token sauvegardé avec succès');
      failedRefreshCount = 0; // Réinitialiser le compteur d'échecs
      return data.token;
    } else {
      throw new Error('Token non reçu dans la réponse');
    }
  } catch (error) {
    console.log('⚠️ Erreur de rafraîchissement (non critique):', error.message);
    // NE PAS propager l'erreur pour éviter la déconnexion
    return null;
  }
};

// Fonction pour démarrer le rafraîchissement automatique
const startTokenRefresh = () => {
  stopTokenRefresh();

  refreshInterval = setInterval(async () => {
    if (isRefreshing) return;

    try {
      isRefreshing = true;
      const newToken = await refreshToken();
      
      if (newToken) {
        console.log('✅ Token rafraîchi automatiquement');
        failedRefreshCount = 0;
      } else {
        console.log('⚠️ Rafraîchissement reporté - session maintenue');
      }
    } catch (error) {
      console.log('⚠️ Échec du rafraîchissement automatique (non bloquant):', error.message);
      // L'utilisateur reste connecté même en cas d'erreur
    } finally {
      isRefreshing = false;
    }
  }, REFRESH_TIME);

  console.log('🔄 Rafraîchissement automatique activé (toutes les 60 minutes)');
};

// Fonction pour arrêter le rafraîchissement automatique
const stopTokenRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('⏹️ Rafraîchissement automatique désactivé');
  }
  isRefreshing = false;
};

// Fonction pour initialiser le rafraîchissement avec gestion d'état de l'app
const initializeTokenRefresh = () => {
  startTokenRefresh();

  // Rafraîchir immédiatement au démarrage
  refreshToken().then(token => {
    if (token) {
      console.log('✅ Token rafraîchi au démarrage');
    }
  }).catch(err => {
    console.log('⚠️ Rafraîchissement initial échoué (non critique)');
  });

  // Gérer les changements d'état de l'application
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('📱 App au premier plan - vérification du token');
      // Vérifier et rafraîchir si nécessaire
      refreshToken().catch(err => {
        console.log('⚠️ Rafraîchissement lors de la reprise échoué (non critique)');
      });
      startTokenRefresh();
    } else if (nextAppState === 'background') {
      console.log('📱 App en arrière-plan - pause du rafraîchissement');
      stopTokenRefresh();
    }
  });

  return subscription;
};

// Fonction pour vérifier si l'utilisateur est connecté et démarrer le rafraîchissement
const checkAndStartTokenRefresh = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      console.log('✅ Utilisateur déjà connecté, démarrage du rafraîchissement automatique');
      initializeTokenRefresh();
      return true;
    }
  } catch (error) {
    console.log('❌ Erreur lors de la vérification de connexion:', error.message);
  }
  return false;
};

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Animations
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true
        }),
      ]).start(() => pulse());
    };
    pulse();

    // Animation flottante
    const floating = () => {
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true
        }),
      ]).start(() => floating());
    };
    floating();

    // Vérifier si l'utilisateur est déjà connecté
    checkAndStartTokenRefresh();

    // Nettoyer à la sortie
    return () => {
      stopTokenRefresh();
    };
  }, []);

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(errorShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const saveFirebaseID = async (firebaseID) => {
    if (!firebaseID) {
      console.log('❌ Le token Firebase est manquant.');
      return false;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('❌ Token utilisateur manquant');
        return false;
      }

      console.log('🔄 Envoi du token Firebase au serveur...');

      const response = await fetch(`${BASE_URL_APP}/firebaseInit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseID,
          platform: Platform.OS,
          appVersion: '2.0.5'
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Firebase ID enregistré avec succès:', responseData);
        await AsyncStorage.setItem('firebaseID', firebaseID);
        await AsyncStorage.setItem('firebaseRegistered', 'true');
        return true;
      } else {
        console.log('❌ Erreur serveur lors de l\'enregistrement:', responseData.error);
        return false;
      }
    } catch (error) {
      console.log('❌ Erreur de connexion à l\'API:', error.message);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    try {
      console.log('🔔 Demande de permission pour les notifications...');

      const alreadyRegistered = await AsyncStorage.getItem('firebaseRegistered');
      if (alreadyRegistered === 'true') {
        console.log('✅ Token Firebase déjà enregistré');
        return await messaging().getToken();
      }

      const authStatus = await messaging().requestPermission({
        sound: true,
        announcement: true,
        badge: true,
        carPlay: true,
        provisional: false,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Permission accordée:', authStatus);

        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          console.log('✅ Token FCM obtenu:', fcmToken.substring(0, 20) + '...');

          try {
            await messaging().subscribeToTopic('all_users');
            console.log('✅ Abonnement au topic all_users réussi');
          } catch (topicError) {
            console.log('⚠️ Erreur abonnement topic:', topicError.message);
          }

          return fcmToken;
        } else {
          console.log('❌ Impossible d\'obtenir le token FCM');
          return null;
        }
      } else {
        console.log('❌ Permission refusée pour les notifications');
        Alert.alert(
          'Notifications désactivées',
          'Pour recevoir les notifications importantes de l\'ISB (emploi du temps, examens, annonces), veuillez activer les notifications dans les paramètres.',
          [
            {
              text: 'Plus tard',
              style: 'cancel'
            },
            {
              text: 'Paramètres',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return null;
      }
    } catch (error) {
      console.log('❌ Erreur lors de la récupération du token FCM:', error.message);
      return null;
    }
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setGeneralError('');

    try {
      const response = await fetch(`${BASE_URL_APP}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mot_pass: password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setEmailError('');
        setPasswordError('');
        setGeneralError('');

        await AsyncStorage.setItem('userToken', data.token);
        console.log("✅ Connexion réussie. Token sauvegardé.");

        // Réinitialiser le compteur d'échecs
        failedRefreshCount = 0;

        try {
          const fcmToken = await requestNotificationPermission();

          if (fcmToken) {
            const firebaseSaved = await saveFirebaseID(fcmToken);
            if (firebaseSaved) {
              console.log("✅ Configuration notifications terminée");
            } else {
              console.log("⚠️ Token Firebase non sauvegardé (non critique)");
            }
          }
        } catch (notifError) {
          console.log('⚠️ Erreur notifications (non bloquante):', notifError.message);
        }

        // Démarrer le rafraîchissement automatique
        console.log('🚀 Démarrage du rafraîchissement automatique du token...');
        initializeTokenRefresh();

        // Afficher le modal de succès
        setIsModalVisible(true);

        // Redirection
        setTimeout(() => {
          setIsModalVisible(false);
          navigation.navigate('Home');
        }, 2000);

      } else {
        handleServerError(data.message || 'Erreur inconnue', response.status);
      }
    } catch (error) {
      console.log('❌ Erreur lors de la connexion:', error.message);

      if (error.message.includes('Network')) {
        setGeneralError('🌐 Problème de connexion internet. Vérifiez votre réseau');
      } else if (error.message.includes('timeout')) {
        setGeneralError('⏱️ Délai d\'attente dépassé. Réessayez');
      } else {
        setGeneralError('🔄 Une erreur est survenue. Veuillez réessayer');
      }

      shakeAnimation();
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour déconnecter MANUELLEMENT seulement
  const handleLogout = async () => {
    try {
      stopTokenRefresh();
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('firebaseID');
      await AsyncStorage.removeItem('firebaseRegistered');
      failedRefreshCount = 0;
      console.log('👋 Utilisateur déconnecté manuellement');
    } catch (error) {
      console.log('❌ Erreur lors de la déconnexion:', error.message);
    }
  };

  const validateInputs = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError('📧 Veuillez saisir votre adresse email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('⚠️ Format d\'email invalide (ex: nom@domaine.com)');
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('🔒 Veuillez saisir votre mot de passe');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('⚠️ Le mot de passe doit contenir au moins 6 caractères');
      valid = false;
    }

    if (!valid) {
      shakeAnimation();
    }

    return valid;
  };

  const handleServerError = (errorMessage, statusCode) => {
    console.log('Erreur serveur:', errorMessage, 'Code:', statusCode);

    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const message = errorMessage.toLowerCase();

    if (message.includes('email') || message.includes('user not found') || message.includes('compte introuvable')) {
      setEmailError('❌ Cette adresse email n\'est pas enregistrée dans notre système');
    } else if (message.includes('password') || message.includes('mot de passe') || message.includes('incorrect password')) {
      setPasswordError('❌ Mot de passe incorrect. Vérifiez votre saisie');
    } else if (message.includes('account disabled') || message.includes('compte désactivé')) {
      setGeneralError('🚫 Votre compte a été désactivé. Contactez l\'administration');
    } else if (message.includes('account suspended') || message.includes('compte suspendu')) {
      setGeneralError('⏸️ Votre compte est temporairement suspendu');
    } else if (statusCode >= 500) {
      setGeneralError('🔧 Problème technique temporaire. Réessayez dans quelques minutes');
    } else if (statusCode === 429) {
      setGeneralError('⏰ Trop de tentatives. Patientez quelques minutes avant de réessayer');
    } else {
      setGeneralError('⚠️ Erreur de connexion. Vérifiez vos identifiants');
    }

    shakeAnimation();
  };

  const scaleButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1.01, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const clearError = (field) => {
    if (field === 'email') setEmailError('');
    if (field === 'password') setPasswordError('');
    if (field === 'general') setGeneralError('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={[ISB_COLORS.background, ISB_COLORS.ultraLight, ISB_COLORS.cardBg]}
        locations={[0, 0.6, 1]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Éléments décoratifs */}
          <View style={styles.decorativeElements}>
            <Animated.View
              style={[
                styles.decorativeCircle,
                styles.circle1,
                { transform: [{ translateY: Animated.multiply(floatingAnim, 8) }] }
              ]}
            />
            <Animated.View
              style={[
                styles.decorativeCircle,
                styles.circle2,
                { transform: [{ translateY: Animated.multiply(floatingAnim, -10) }] }
              ]}
            />
            <Animated.View
              style={[
                styles.decorativeCircle,
                styles.circle3,
                { transform: [{ translateY: Animated.multiply(floatingAnim, 6) }] }
              ]}
            />
          </View>

          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: cardOpacityAnim,
                transform: [
                  { scale: Animated.multiply(logoScaleAnim, pulseAnim) },
                  { translateY: slideAnim }
                ]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image source={require('../assets/isb.png')} style={styles.logo} />
              </View>
              <View style={styles.logoAccent} />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue sur ISB</Text>
            <Text style={styles.welcomeSubtitle}>
              International School of Business
            </Text>
            <View style={styles.titleDivider}>
              <View style={styles.titleDividerInner} />
            </View>
          </Animated.View>

          {/* Carte de connexion */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacityAnim,
                transform: [
                  { translateY: slideAnim },
                  { translateX: errorShakeAnim }
                ]
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Connexion Étudiante</Text>
              <Text style={styles.cardSubtitle}>
                Accédez à votre espace personnel ISB
              </Text>
            </View>

            {generalError ? (
              <Animated.View
                style={[
                  styles.generalErrorContainer,
                  { transform: [{ translateX: errorShakeAnim }] }
                ]}
              >
                <View style={styles.errorIconContainer}>
                  <FontAwesome5 name="exclamation-triangle" size={14} color={ISB_COLORS.error} />
                </View>
                <Text style={styles.generalErrorText}>{generalError}</Text>
                <TouchableOpacity
                  onPress={() => clearError('general')}
                  style={styles.closeErrorButton}
                >
                  <FontAwesome5 name="times" size={10} color={ISB_COLORS.error} />
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <FontAwesome5 name="envelope" size={11} color={ISB_COLORS.primary} /> Adresse email
              </Text>
              <View style={[
                styles.inputContainer,
                emailError && styles.inputError,
                !emailError && email.length > 0 && styles.inputSuccess
              ]}>
                <View style={[
                  styles.inputIconContainer,
                  emailError && styles.iconError,
                  !emailError && email.length > 0 && styles.iconSuccess
                ]}>
                  <FontAwesome5
                    name={emailError ? "exclamation-circle" : (email.length > 0 ? "check-circle" : "envelope")}
                    size={16}
                    color={
                      emailError ? ISB_COLORS.error :
                        (!emailError && email.length > 0 ? ISB_COLORS.success : ISB_COLORS.primary)
                    }
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="votre.email@isb-ens.tn"
                  placeholderTextColor={ISB_COLORS.textVeryLight}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) clearError('email');
                  }}
                  value={email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => clearError('email')}
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail('')} style={styles.clearButton}>
                    <FontAwesome5 name="times-circle" size={14} color={ISB_COLORS.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              {emailError ? (
                <Animated.View style={[styles.errorContainer, { transform: [{ translateX: errorShakeAnim }] }]}>
                  <Text style={styles.errorText}>{emailError}</Text>
                </Animated.View>
              ) : null}
            </View>

            {/* Input Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <FontAwesome5 name="lock" size={11} color={ISB_COLORS.primary} /> Mot de passe
              </Text>
              <View style={[
                styles.inputContainer,
                passwordError && styles.inputError,
                !passwordError && password.length >= 6 && styles.inputSuccess
              ]}>
                <View style={[
                  styles.inputIconContainer,
                  passwordError && styles.iconError,
                  !passwordError && password.length >= 6 && styles.iconSuccess
                ]}>
                  <FontAwesome5
                    name={passwordError ? "exclamation-circle" : (password.length >= 6 ? "check-circle" : "lock")}
                    size={16}
                    color={
                      passwordError ? ISB_COLORS.error :
                        (!passwordError && password.length >= 6 ? ISB_COLORS.success : ISB_COLORS.primary)
                    }
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={ISB_COLORS.textVeryLight}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) clearError('password');
                  }}
                  value={password}
                  secureTextEntry={!showPassword}
                  onFocus={() => clearError('password')}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <FontAwesome5
                    name={showPassword ? "eye-slash" : "eye"}
                    size={16}
                    color={ISB_COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Animated.View style={[styles.errorContainer, { transform: [{ translateX: errorShakeAnim }] }]}>
                  <Text style={styles.errorText}>{passwordError}</Text>
                </Animated.View>
              ) : null}
            </View>

            {/* Bouton de connexion */}
            <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: buttonScaleAnim }] }]}>
              <TouchableOpacity
                onPress={() => {
                  scaleButton();
                  handleLogin();
                }}
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                  (emailError || passwordError || generalError) && styles.loginButtonError
                ]}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading
                    ? [ISB_COLORS.textLight, ISB_COLORS.textVeryLight]
                    : (emailError || passwordError || generalError)
                      ? [ISB_COLORS.error, '#dc2626']
                      : [ISB_COLORS.primary, ISB_COLORS.darkBlue, ISB_COLORS.secondary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.7, 1]}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.loginButtonText}>Connexion...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <FontAwesome5
                        name={(emailError || passwordError || generalError) ? "exclamation-triangle" : "sign-in-alt"}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.loginButtonText}>
                        {(emailError || passwordError || generalError) ? "Corriger" : "Se connecter"}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

         

          </Animated.View>
        </ScrollView>

        <Modal
          isVisible={isModalVisible}
          onBackdropPress={() => setIsModalVisible(false)}
          backdropOpacity={0.8}
          animationIn="zoomInUp"
          animationOut="zoomOutDown"
          backdropTransitionOutTiming={0}
          style={styles.modal}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[ISB_COLORS.success, '#059669']}
              style={styles.modalIconContainer}
            >
              <FontAwesome5 name="check" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.modalTitle}>Connexion réussie !</Text>
            <Text style={styles.modalSubtitle}>
              Bienvenue à l'International School of Business
            </Text>
            <View style={styles.modalBadge}>
              <FontAwesome5 name="graduation-cap" size={14} color={ISB_COLORS.secondary} />
              <Text style={styles.modalBadgeText}>Espace Étudiant</Text>
            </View>
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={ISB_COLORS.primary} />
              <Text style={styles.modalLoadingText}>Redirection...</Text>
            </View>
     
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },

  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.06,
  },
  circle1: {
    width: 180,
    height: 180,
    backgroundColor: ISB_COLORS.primary,
    top: -40,
    right: -50,
  },
  circle2: {
    width: 120,
    height: 120,
    backgroundColor: ISB_COLORS.secondary,
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 80,
    height: 80,
    backgroundColor: ISB_COLORS.accent,
    top: 160,
    left: 50,
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
    zIndex: 1,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoBackground: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ISB_COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ISB_COLORS.shadowHard,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 2,
    borderColor: ISB_COLORS.ultraLight,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  logoAccent: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 26,
    height: 26,
    backgroundColor: ISB_COLORS.secondary,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: ISB_COLORS.cardBg,
    shadowColor: ISB_COLORS.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ISB_COLORS.primary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  titleDivider: {
    alignItems: 'center',
  },
  titleDividerInner: {
    width: 60,
    height: 3,
    backgroundColor: ISB_COLORS.secondary,
    borderRadius: 2,
    shadowColor: ISB_COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  card: {
    backgroundColor: ISB_COLORS.cardBg,
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 4,
    shadowColor: ISB_COLORS.shadowHard,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: ISB_COLORS.ultraLight,
    zIndex: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ISB_COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  refreshInfo: {
    fontSize: 11,
    color: ISB_COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },

  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: ISB_COLORS.error,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: ISB_COLORS.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  errorIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  generalErrorText: {
    flex: 1,
    color: ISB_COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  closeErrorButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ISB_COLORS.text,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: ISB_COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 52,
    shadowColor: ISB_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  inputError: {
    borderColor: ISB_COLORS.borderError,
    backgroundColor: '#fef2f2',
    shadowColor: ISB_COLORS.error,
  },
  inputSuccess: {
    borderColor: ISB_COLORS.borderSuccess,
    backgroundColor: '#f0fdf4',
    shadowColor: ISB_COLORS.success,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: ISB_COLORS.ultraLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: ISB_COLORS.text,
    paddingVertical: 12,
    fontWeight: '500',
  },
  clearButton: {
    padding: 10,
    marginRight: 2,
    borderRadius: 10,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 4,
    borderRadius: 10,
  },
  errorContainer: {
    marginTop: 6,
    marginLeft: 2,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: ISB_COLORS.error,
  },
  errorText: {
    color: ISB_COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },

  buttonWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: ISB_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    shadowOpacity: 0.08,
    elevation: 3,
  },
  loginButtonError: {
    shadowColor: ISB_COLORS.error,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 0.3,
  },

  autoRefreshInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: ISB_COLORS.ultraLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ISB_COLORS.border,
  },
  autoRefreshInfoText: {
    fontSize: 11,
    color: ISB_COLORS.textLight,
    marginLeft: 8,
    textAlign: 'center',
  },

  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: ISB_COLORS.cardBg,
    padding: 32,
    borderRadius: 28,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: ISB_COLORS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: ISB_COLORS.ultraLight,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: ISB_COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ISB_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ISB_COLORS.ultraLightOrange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: ISB_COLORS.lightOrange,
  },
  modalBadgeText: {
    color: ISB_COLORS.darkOrange,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalLoader: {
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: ISB_COLORS.textLight,
    fontWeight: '600',
  },
  modalRefreshNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
    backgroundColor: ISB_COLORS.ultraLight,
    borderRadius: 12,
  },
  modalRefreshNoteText: {
    fontSize: 11,
    color: ISB_COLORS.textLight,
    marginLeft: 8,
  },
});

export default LoginPage;
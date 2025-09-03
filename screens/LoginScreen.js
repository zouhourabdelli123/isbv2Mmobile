import React, { useState, useRef } from 'react';
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
  Platform,Linking
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL_APP } from '../api';
// Correction des imports Firebase
import messaging from '@react-native-firebase/messaging';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
const { width, height } = Dimensions.get('window');

// Palette de couleurs améliorée inspirée du logo ISB
const ISB_COLORS = {
  // Couleurs principales du logo
  primary: '#1e40af',        // Bleu principal ISB (plus profond)
  secondary: '#f59e0b',      // Orange/Jaune ISB (plus chaud)
  accent: '#3b82f6',         // Bleu accent (plus moderne)
  
  // Nuances de bleu
  darkBlue: '#1e3a8a',       // Bleu très foncé
  lightBlue: '#60a5fa',      // Bleu clair
  ultraLight: '#dbeafe',     // Bleu ultra-léger
  
  // Nuances d'orange/jaune
  darkOrange: '#d97706',     // Orange foncé
  lightOrange: '#fbbf24',    // Orange clair
  ultraLightOrange: '#fef3c7', // Orange ultra-léger
  
  // Couleurs neutres améliorées
  background: '#f8fafc',     // Gris très clair avec nuance bleue
  cardBg: '#ffffff',         // Blanc pur
  text: '#0f172a',           // Gris très foncé (meilleur contraste)
  textLight: '#64748b',      // Gris moyen
  textVeryLight: '#94a3b8',  // Gris léger
  
  // Couleurs d'état
  success: '#10b981',        // Vert succès
  error: '#ef4444',          // Rouge erreur
  warning: '#f59e0b',        // Orange warning
  info: '#3b82f6',           // Bleu info
  
  // Couleurs spéciales
  shadow: 'rgba(30, 64, 175, 0.12)', // Ombre bleue douce
  shadowHard: 'rgba(30, 64, 175, 0.25)', // Ombre bleue forte
  overlay: 'rgba(15, 23, 42, 0.4)',  // Overlay sombre
  
  // Couleurs de bordure
  border: '#e2e8f0',         // Bordure gris clair
  borderActive: '#3b82f6',   // Bordure active bleue
  borderError: '#ef4444',    // Bordure erreur rouge
  borderSuccess: '#10b981',  // Bordure succès verte
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
  
  // Animations améliorées
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animation d'entrée plus fluide
    Animated.parallel([
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation plus subtile pour le logo
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1.03, 
          duration: 3000, 
          useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 3000, 
          useNativeDriver: true 
        }),
      ]).start(() => pulse());
    };
    pulse();

    // Animation flottante pour les éléments décoratifs
    const floating = () => {
      Animated.sequence([
        Animated.timing(floatingAnim, { 
          toValue: 1, 
          duration: 4000, 
          useNativeDriver: true 
        }),
        Animated.timing(floatingAnim, { 
          toValue: 0, 
          duration: 4000, 
          useNativeDriver: true 
        }),
      ]).start(() => floating());
    };
    floating();
  }, []);

  // Animation de secousse améliorée pour les erreurs
  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(errorShakeAnim, { toValue: 15, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: -15, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
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

  // Fonction pour demander la permission de notification
const requestNotificationPermission = async () => {
  try {
    console.log('🔔 Demande de permission pour les notifications...');
    
    // Vérifier si déjà enregistré
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
        
        // S'abonner au topic 'all_users'
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
    Alert.alert(
      'Erreur de notifications',
      'Une erreur est survenue lors de la configuration des notifications. Vous pourrez les activer plus tard dans les paramètres.'
    );
    return null;
  }
};

  // Validation améliorée avec messages plus clairs
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

  // Fonction pour analyser les erreurs du serveur (améliorée)
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

      // Gestion des notifications FCM (non bloquante)
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
        // Les erreurs de notification ne doivent pas empêcher la connexion
      }

      // Afficher le modal de succès
      setIsModalVisible(true);
      
      // Redirection avec délai
      setTimeout(() => {
        setIsModalVisible(false);
        navigation.navigate('Home');
      }, 2500);
      
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
  
  const scaleButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1.02, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
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
        locations={[0, 0.7, 1]}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Éléments décoratifs améliorés */}
          <View style={styles.decorativeElements}>
            <Animated.View 
              style={[
                styles.decorativeCircle, 
                styles.circle1,
                { transform: [{ translateY: Animated.multiply(floatingAnim, 10) }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.decorativeCircle, 
                styles.circle2,
                { transform: [{ translateY: Animated.multiply(floatingAnim, -15) }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.decorativeCircle, 
                styles.circle3,
                { transform: [{ translateY: Animated.multiply(floatingAnim, 8) }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.decorativeCircle, 
                styles.circle4,
                { transform: [{ translateY: Animated.multiply(floatingAnim, -12) }] }
              ]} 
            />
          </View>

          {/* Header avec logo et titre amélioré */}
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
              <View style={styles.logoGlow} />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue sur ISB</Text>
            <Text style={styles.welcomeSubtitle}>
              International School of Business
            </Text>
            <View style={styles.titleDivider}>
              <View style={styles.titleDividerInner} />
            </View>
          </Animated.View>

          {/* Carte de connexion améliorée */}
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
                  <FontAwesome5 name="exclamation-triangle" size={16} color={ISB_COLORS.error} />
                </View>
                <Text style={styles.generalErrorText}>{generalError}</Text>
                <TouchableOpacity 
                  onPress={() => clearError('general')} 
                  style={styles.closeErrorButton}
                >
                  <FontAwesome5 name="times" size={12} color={ISB_COLORS.error} />
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {/* Input Email amélioré */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <FontAwesome5 name="envelope" size={12} color={ISB_COLORS.primary} /> Adresse email
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
                    size={18} 
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
                    <FontAwesome5 name="times-circle" size={16} color={ISB_COLORS.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              {emailError ? (
                <Animated.View style={[styles.errorContainer, { transform: [{ translateX: errorShakeAnim }] }]}>
                  <Text style={styles.errorText}>{emailError}</Text>
                </Animated.View>
              ) : null}
            </View>

            {/* Input Mot de passe amélioré */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <FontAwesome5 name="lock" size={12} color={ISB_COLORS.primary} /> Mot de passe
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
                    size={18} 
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
                    size={18} 
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

            {/* Bouton de connexion amélioré */}
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
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
                      <Text style={styles.loginButtonText}>Connexion en cours...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <FontAwesome5 
                        name={(emailError || passwordError || generalError) ? "exclamation-triangle" : "sign-in-alt"} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.loginButtonText}>
                        {(emailError || passwordError || generalError) ? "Corriger les erreurs" : "Se connecter"}
                      </Text>
                      <View style={styles.buttonAccent} />
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
              colors={[ISB_COLORS.success, '#059669', '#047857']}
              style={styles.modalIconContainer}
            >
              <FontAwesome5 name="check" size={36} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.modalTitle}>Connexion réussie !</Text>
            <Text style={styles.modalSubtitle}>
              Bienvenue à l'International School of Business
            </Text>
            <View style={styles.modalBadge}>
              <FontAwesome5 name="graduation-cap" size={16} color={ISB_COLORS.secondary} />
              <Text style={styles.modalBadgeText}>Espace Étudiant</Text>
            </View>
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={ISB_COLORS.primary} />
              <Text style={styles.modalLoadingText}>Redirection en cours...</Text>
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
    paddingTop: 50,
    paddingBottom: 30,
  },
  
  // Éléments décoratifs améliorés
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
    opacity: 0.08,
  },
  circle1: {
    width: 220,
    height: 220,
    backgroundColor: ISB_COLORS.primary,
    top: -60,
    right: -60,
  },
  circle2: {
    width: 160,
    height: 160,
    backgroundColor: ISB_COLORS.secondary,
    bottom: 120,
    left: -40,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: ISB_COLORS.accent,
    top: 180,
    left: 60,
  },
  circle4: {
    width: 80,
    height: 80,
    backgroundColor: ISB_COLORS.lightOrange,
    bottom: 300,
    right: 40,
  },

  // Header amélioré
  header: {
    alignItems: 'center',
    marginBottom: 35,
    zIndex: 1,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: ISB_COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ISB_COLORS.shadowHard,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 3,
    borderColor: ISB_COLORS.ultraLight,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  logoAccent: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: ISB_COLORS.secondary,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: ISB_COLORS.cardBg,
    shadowColor: ISB_COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: ISB_COLORS.ultraLight,
    opacity: 0.6,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: ISB_COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  titleDivider: {
    alignItems: 'center',
  },
  titleDividerInner: {
    width: 80,
    height: 4,
    backgroundColor: ISB_COLORS.secondary,
    borderRadius: 2,
    shadowColor: ISB_COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Carte de connexion améliorée
  card: {
    backgroundColor: ISB_COLORS.cardBg,
    borderRadius: 32,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: ISB_COLORS.shadowHard,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1,
    borderColor: ISB_COLORS.ultraLight,
    zIndex: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ISB_COLORS.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: ISB_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: ISB_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 15,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Messages d'erreur améliorés
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: ISB_COLORS.error,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: ISB_COLORS.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  generalErrorText: {
    flex: 1,
    color: ISB_COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeErrorButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  // Inputs améliorés
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: ISB_COLORS.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: ISB_COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 60,
    shadowColor: ISB_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    width: 48,
    height: 48,
    backgroundColor: ISB_COLORS.ultraLight,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: ISB_COLORS.text,
    paddingVertical: 14,
    fontWeight: '500',
  },
  clearButton: {
    padding: 12,
    marginRight: 4,
    borderRadius: 12,
  },
  eyeIcon: {
    padding: 12,
    marginRight: 8,
    borderRadius: 12,
  },
  errorContainer: {
    marginTop: 8,
    marginLeft: 4,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: ISB_COLORS.error,
  },
  errorText: {
    color: ISB_COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Bouton de connexion amélioré
  loginButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: ISB_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 28,
    marginTop: 8,
  },
  loginButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 4,
  },
  loginButtonError: {
    shadowColor: ISB_COLORS.error,
  },
  loginButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  buttonAccent: {
    position: 'absolute',
    right: -24,
    width: 4,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },

  // Section d'aide améliorée
  helpContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  helpDivider: {
    width: 40,
    height: 2,
    backgroundColor: ISB_COLORS.border,
    borderRadius: 1,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    color: ISB_COLORS.textLight,
    marginBottom: 12,
    fontWeight: '500',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: ISB_COLORS.ultraLight,
  },
  helpLink: {
    fontSize: 14,
    color: ISB_COLORS.primary,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Modal améliorée
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: ISB_COLORS.cardBg,
    padding: 40,
    borderRadius: 32,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: ISB_COLORS.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: ISB_COLORS.ultraLight,
  },
  modalIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: ISB_COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ISB_COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: ISB_COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ISB_COLORS.ultraLightOrange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: ISB_COLORS.lightOrange,
  },
  modalBadgeText: {
    color: ISB_COLORS.darkOrange,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalLoader: {
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: ISB_COLORS.textLight,
    fontWeight: '600',
  },
});

export default LoginPage;
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
  Platform
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL_APP } from '../api';
// Remove Expo notifications import
// import * as Notifications from 'expo-notifications';
// Add Firebase messaging import
import messaging from '@react-native-firebase/messaging';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Couleurs inspirées du logo IIT
const IIT_COLORS = {
  primary: '#1E40AF',     // Bleu principal IIT
  secondary: '#FBB040',   // Jaune/Orange IIT
  darkBlue: '#1E3A8A',    // Bleu foncé
  lightBlue: '#3B82F6',   // Bleu clair
  accent: '#F59E0B',      // Accent jaune
  background: '#F8FAFC',  // Gris très clair
  cardBg: '#FFFFFF',      // Blanc pur
  text: '#1F2937',        // Gris foncé
  textLight: '#6B7280',   // Gris moyen
  success: '#10B981',     // Vert succès
  error: '#EF4444',       // Rouge erreur
  warning: '#F59E0B',     // Orange warning
  shadow: 'rgba(30, 64, 175, 0.1)', // Ombre bleue
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
  
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animation d'entrée améliorée
    Animated.parallel([
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation subtile pour le logo
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // Animation de secousse pour les erreurs
  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(errorShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const saveFirebaseID = async (firebaseID) => {
    if (!firebaseID) {
      console.log('Le token Firebase est manquant.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL_APP}/firebaseInit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`,
        },
        body: JSON.stringify({ firebaseID }),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('Firebase ID enregistré avec succès:', responseData);
        await AsyncStorage.setItem('firebaseID', firebaseID);
      } else {
        console.log('Erreur lors de l\'enregistrement du Firebase ID:', responseData.error);
      }
    } catch (error) {
      console.log('Erreur de connexion à l\'API:', error);
    }
  };

  // Updated function to get FCM token instead of Expo token
  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        return await messaging().getToken();
      } else {
        Alert.alert('Permission refusée', 'Les notifications ne seront pas disponibles');
        return null;
      }
    } catch (error) {
      console.log('Erreur lors de la récupération du token FCM:', error);
      return null;
    }
  };

  // Validation améliorée avec messages spécifiques
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
    } else if (!email.toLowerCase().includes('iit.ens.tn') && !email.toLowerCase().includes('@gmail.com') && !email.toLowerCase().includes('@outlook.com') && !email.toLowerCase().includes('@yahoo.com')) {
      setEmailError('💡 Utilisez de préférence votre email institutionnel @iit.ens.tn');
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

  // Fonction pour analyser les erreurs du serveur et afficher des messages spécifiques
  const handleServerError = (errorMessage, statusCode) => {
    console.log('Erreur serveur:', errorMessage, 'Code:', statusCode);
    
    // Réinitialiser les erreurs
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const message = errorMessage.toLowerCase();

    // Erreurs spécifiques à l'email
    if (message.includes('email') || message.includes('user not found') || message.includes('compte introuvable')) {
      setEmailError('❌ Cette adresse email n\'est pas enregistrée dans notre système');
    }
    // Erreurs spécifiques au mot de passe
    else if (message.includes('password') || message.includes('mot de passe') || message.includes('incorrect password')) {
      setPasswordError('❌ Mot de passe incorrect. Vérifiez votre saisie');
    }
    // Erreurs de compte
    else if (message.includes('account disabled') || message.includes('compte désactivé')) {
      setGeneralError('🚫 Votre compte a été désactivé. Contactez l\'administration');
    }
    else if (message.includes('account suspended') || message.includes('compte suspendu')) {
      setGeneralError('⏸️ Votre compte est temporairement suspendu');
    }
    // Erreurs réseau/serveur
    else if (statusCode >= 500) {
      setGeneralError('🔧 Problème technique temporaire. Réessayez dans quelques minutes');
    }
    else if (statusCode === 429) {
      setGeneralError('⏰ Trop de tentatives. Patientez quelques minutes avant de réessayer');
    }
    // Erreur générale
    else {
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
        // Succès - effacer toutes les erreurs
        setEmailError('');
        setPasswordError('');
        setGeneralError('');
        
        await AsyncStorage.setItem('userToken', data.token);
        console.log("Connexion réussie. Redirection vers la page d'accueil.", data.token);

        // Gestion des notifications FCM
        try {
          const fcmToken = await requestNotificationPermission();
          console.log("Token FCM récupéré:", fcmToken);

          if (fcmToken) {
            await saveFirebaseID(fcmToken);
          }
        } catch (notifError) {
          console.log('Erreur notifications (non bloquante):', notifError);
        }

        setIsModalVisible(true);
        setTimeout(() => {
          navigation.navigate('Home');
        }, 2000);
        
      } else {
        // Erreur - analyser et afficher le message approprié
        handleServerError(data.message || 'Erreur inconnue', response.status);
      }
    } catch (error) {
      console.log('Erreur lors de la connexion:', error.message);
      
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
      Animated.timing(buttonScaleAnim, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
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
        colors={[IIT_COLORS.background, '#E0F2FE', IIT_COLORS.cardBg]}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Éléments décoratifs */}
          <View style={styles.decorativeElements}>
            <View style={[styles.decorativeCircle, styles.circle1]} />
            <View style={[styles.decorativeCircle, styles.circle2]} />
            <View style={[styles.decorativeCircle, styles.circle3]} />
          </View>

          {/* Header avec logo et titre */}
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
              <Image source={require('../assets/isb.png')} style={styles.logo} />
              <View style={styles.logoAccent} />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue sur IIT</Text>
            <Text style={styles.welcomeSubtitle}>
              Institut International de Technologie
            </Text>
            <View style={styles.titleDivider} />
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
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>Accédez à votre espace étudiant</Text>
            </View>

            {/* Message d'erreur général */}
            {generalError ? (
              <View style={styles.generalErrorContainer}>
                <FontAwesome5 name="exclamation-triangle" size={16} color={IIT_COLORS.error} />
                <Text style={styles.generalErrorText}>{generalError}</Text>
                <TouchableOpacity onPress={() => clearError('general')} style={styles.closeErrorButton}>
                  <FontAwesome5 name="times" size={12} color={IIT_COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse email</Text>
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
                    color={emailError ? IIT_COLORS.error : (!emailError && email.length > 0 ? IIT_COLORS.success : IIT_COLORS.primary)} 
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="votre.email@iit.ens.tn"
                  placeholderTextColor={IIT_COLORS.textLight}
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
                    <FontAwesome5 name="times-circle" size={16} color={IIT_COLORS.textLight} />
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
              <Text style={styles.inputLabel}>Mot de passe</Text>
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
                    color={passwordError ? IIT_COLORS.error : (!passwordError && password.length >= 6 ? IIT_COLORS.success : IIT_COLORS.primary)} 
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={IIT_COLORS.textLight}
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
                    color={IIT_COLORS.textLight} 
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
                    ? ['#9CA3AF', '#6B7280'] 
                    : (emailError || passwordError || generalError)
                    ? [IIT_COLORS.error, '#DC2626']
                    : [IIT_COLORS.primary, IIT_COLORS.darkBlue, IIT_COLORS.secondary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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

            {/* Lien d'aide */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>Problème de connexion ?</Text>
              <TouchableOpacity onPress={() => Alert.alert('Aide', 'Contactez l\'administration à info@iit.tn')}>
                <Text style={styles.helpLink}>Obtenir de l'aide</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Modal de succès */}
        <Modal 
          isVisible={isModalVisible} 
          onBackdropPress={() => setIsModalVisible(false)}
          backdropOpacity={0.7}
          animationIn="zoomInUp"
          animationOut="zoomOutDown"
          backdropTransitionOutTiming={0}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[IIT_COLORS.success, '#059669']}
              style={styles.modalIconContainer}
            >
              <FontAwesome5 name="check" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.modalTitle}>Connexion réussie !</Text>
            <Text style={styles.modalSubtitle}>
              Bienvenue à l'Institut International de Technologie
            </Text>
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={IIT_COLORS.primary} />
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
    opacity: 0.1,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: IIT_COLORS.primary,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: IIT_COLORS.secondary,
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 80,
    height: 80,
    backgroundColor: IIT_COLORS.accent,
    top: 150,
    left: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 1,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  logoAccent: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 20,
    height: 20,
    backgroundColor: IIT_COLORS.secondary,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: IIT_COLORS.cardBg,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: IIT_COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: IIT_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  titleDivider: {
    width: 60,
    height: 3,
    backgroundColor: IIT_COLORS.secondary,
    borderRadius: 2,
  },
  card: {
    backgroundColor: IIT_COLORS.cardBg,
    borderRadius: 28,
    padding: 28,
    marginHorizontal: 4,
    shadowColor: IIT_COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    zIndex: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: IIT_COLORS.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: IIT_COLORS.textLight,
    textAlign: 'center',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: IIT_COLORS.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  generalErrorText: {
    flex: 1,
    color: IIT_COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  closeErrorButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: IIT_COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 56,
  },
  inputError: {
    borderColor: IIT_COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    borderColor: IIT_COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
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
    fontSize: 16,
    color: IIT_COLORS.text,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 8,
    marginRight: 4,
  },
  eyeIcon: {
    padding: 12,
    marginRight: 4,
  },
  errorContainer: {
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: IIT_COLORS.error,
    fontSize: 12,
    fontWeight: '500',
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 4,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginRight: 8,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  loginButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: IIT_COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  loginButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 3,
  },
  loginButtonError: {
    shadowColor: IIT_COLORS.error,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    minHeight: 60,
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
    marginLeft: 12,
  },
  buttonAccent: {
    position: 'absolute',
    right: -20,
    width: 4,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  helpText: {
    fontSize: 14,
    color: IIT_COLORS.textLight,
    marginBottom: 4,
  },
  helpLink: {
    fontSize: 14,
    color: IIT_COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    backgroundColor: IIT_COLORS.cardBg,
    padding: 36,
    borderRadius: 28,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: IIT_COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: IIT_COLORS.success,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: IIT_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: IIT_COLORS.textLight,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  modalLoader: {
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: IIT_COLORS.textLight,
    fontWeight: '500',
  },
});

export default LoginPage;
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');

// Couleurs du thème ISB
const ISB_COLORS = {
  primary: '#1B4F8C', // Bleu principal ISB
  secondary: '#2E5BA8', // Bleu secondaire
  accent: '#F9A825', // Jaune/Orange ISB
  white: '#FFFFFF',
  lightBlue: '#E3F2FD',
  darkBlue: '#0D47A1',
  gray: '#6B7280',
  lightGray: '#F5F5F5',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#FAFAFA',
};

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [profileAnim] = useState(new Animated.Value(0));
  const [profileData, setProfileData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [academicYear, setAcademicYear] = useState('');

  // Fonction pour formater la date actuelle
  const formatCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Africa/Tunis'
    };
    return currentDate.toLocaleDateString('fr-FR', options);
  };

  // Fonction pour formater la date de naissance
  const formatBirthDate = (dateString) => {
    if (!dateString) return 'Non spécifié';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Fonction pour calculer l'année académique
  const calculateAcademicYear = (date) => {
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0-11
    
    if (currentMonth >= 8) { // Septembre = 8
      return `${currentYear}/${currentYear + 1}`;
    } else {
      return `${currentYear - 1}/${currentYear}`;
    }
  };

  // Fonction pour mettre à jour la date en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);
      setAcademicYear(calculateAcademicYear(now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fonction pour appeler l'API getProfile
  const fetchProfileFromAPI = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        return null;
      }

      const response = await fetch(`https://isbadmin.tn/api/getProfile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          return null;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.etudiant) {
        return data.etudiant;
      } else {
        throw new Error('Données de profil invalides');
      }

    } catch (error) {
      console.log('Erreur fetchProfile:', error.message);
      
      if (error.message.includes('Network')) {
        Alert.alert('Erreur de connexion', 'Vérifiez votre connexion internet');
      } else if (error.message.includes('token_message')) {
        Alert.alert('Erreur d\'authentification', 'Veuillez vous reconnecter');
      } else {
        Alert.alert('Erreur', 'Impossible de récupérer le profil');
      }
      
      return null;
    }
  };

  const fetchUserInfo = async () => {
    setLoading(true);
    
    try {
      const profileFromAPI = await fetchProfileFromAPI();
      
      if (profileFromAPI) {
        setProfileData(profileFromAPI);
        
        // Mettre à jour les données locales
        await AsyncStorage.setItem('userData', JSON.stringify(profileFromAPI));
      }

      // Animations séquentielles
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(profileAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();

    } catch (error) {
      console.log('Erreur fetchUserInfo:', error.message);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour nettoyer les données utilisateur
  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
    } catch (error) {
      console.log('Erreur clearUserData:', error);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const token = await AsyncStorage.getItem('userToken');
              
              if (!token) {
                await clearUserData();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
              }

              const response = await fetch(`https://isbadmin.tn/api/logout`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              // Peu importe la réponse de l'API, on nettoie les données locales
              await clearUserData();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

            } catch (error) {
              console.log('Erreur logout:', error);
              await clearUserData();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserInfo();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Header title="Profil Étudiant" withBackButton />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ISB_COLORS.primary]}
            tintColor={ISB_COLORS.primary}
          />
        }
      >
        {/* Hero Section avec design ISB */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={[ISB_COLORS.primary, ISB_COLORS.secondary, ISB_COLORS.darkBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Éléments décoratifs inspirés du logo ISB */}
            <View style={styles.decorativeElements}>
              <View style={[styles.decorativeCircle, { backgroundColor: ISB_COLORS.accent + '20' }]} />
              <View style={[styles.decorativeSquare, { backgroundColor: ISB_COLORS.accent + '10' }]} />
            </View>

            <View style={styles.heroContent}>
              {/* Logo ISB en arrière-plan */}
              <View style={styles.logoBackground}>
                <MaterialIcons name="school" size={100} color={ISB_COLORS.accent + '30'} />
              </View>

              {/* Photo de profil avec design ISB */}
              <Animated.View 
                style={[
                  styles.profileImageContainer,
                  {
                    transform: [{
                      scale: profileAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }]
                  }
                ]}
              >
                {profileData?.photo ? (
                  <Image 
                    source={{ uri: profileData.photo }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.defaultProfileImage}>
                    <MaterialIcons name="person" size={60} color={ISB_COLORS.white} />
                  </View>
                )}
                <View style={styles.profileImageBadge}>
                  <MaterialIcons name="verified" size={18} color={ISB_COLORS.success} />
                </View>
                <View style={[styles.profileImageGlow, { backgroundColor: ISB_COLORS.accent + '20' }]} />
              </Animated.View>

              {profileData && (
                <Animated.View 
                  style={[
                    styles.heroInfo,
                    {
                      opacity: profileAnim,
                      transform: [{
                        translateY: profileAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }]
                    }
                  ]}
                >
                  <View style={styles.isbBranding}>
                    <Text style={styles.isbLabel}>ISB STUDENT</Text>
                  </View>
                  
                  <Text style={styles.heroName}>
                    {profileData.prenom} {profileData.nom}
                  </Text>
                  
                  <Text style={styles.heroCode}>
                    Code étudiant: {profileData.code_etudiant}
                  </Text>
                  
                  {/* Section des dates en temps réel avec design ISB */}
                  <View style={styles.dateContainer}>
                    <View style={styles.dateItem}>
                      <MaterialIcons name="event" size={16} color={ISB_COLORS.accent} />
                      <Text style={styles.dateText}>
                        {formatCurrentDate()}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Section Informations Personnelles */}
        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: profileAnim,
              transform: [{
                translateY: profileAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
  
        </Animated.View>

        {/* Section Informations Académiques */}
        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: profileAnim,
              transform: [{
                translateY: profileAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          {profileData && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIconContainer, { backgroundColor: ISB_COLORS.lightBlue }]}>
                    <MaterialIcons name="school" size={24} color={ISB_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Informations Académiques</Text>
                    <Text style={styles.cardSubtitle}>International School of Business</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#EFF6FF' }]}>
                    <MaterialIcons name="calendar-today" size={22} color={ISB_COLORS.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Année académique</Text>
                    <Text style={styles.infoValue}>
                      {profileData.year || 'Non spécifié'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#F0F9FF' }]}>
                    <MaterialIcons name="class" size={22} color={ISB_COLORS.secondary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Niveau</Text>
                    <Text style={styles.infoValue}>
                      {profileData.niveau ? `${profileData.niveau}ème année` : 'Non spécifié'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                    <MaterialIcons name="workspaces" size={22} color={ISB_COLORS.success} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Spécialité</Text>
                    <Text style={styles.infoValue}>
                      {profileData.specialite || 'Non spécifié'}
                    </Text>
                  </View>
                </View>

          
              </View>
            </View>
          )}
        </Animated.View>

        {/* Section Paramètres */}
        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: cardsAnim,
              transform: [{
                translateY: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.actionsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#F0F4F8' }]}>
                  <MaterialIcons name="settings" size={24} color={ISB_COLORS.gray} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Paramètres</Text>
                  <Text style={styles.cardSubtitle}>Gérer votre compte</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <View style={styles.separator} />

              <TouchableOpacity 
                style={[styles.actionButtonSecondary, styles.logoutButton]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.actionButtonLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
                    <MaterialIcons name="logout" size={20} color={ISB_COLORS.error} />
                  </View>
                  <Text style={[styles.actionButtonTextSecondary, { color: ISB_COLORS.error }]}>
                    Se déconnecter
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={ISB_COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Espace en bas pour une meilleure navigation */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: ISB_COLORS.background 
  },
  scrollView: {
    flex: 1,
  },

  // Hero Section avec design ISB
  heroSection: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeSquare: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 20,
    transform: [{ rotate: '45deg' }],
  },
  logoBackground: {
    position: 'absolute',
    top: 10,
    right: 20,
    opacity: 0.3,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: ISB_COLORS.accent,
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: ISB_COLORS.accent,
  },
  profileImageBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: ISB_COLORS.white,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 70,
    zIndex: -1,
  },
  heroInfo: {
    alignItems: 'center',
  },
  isbBranding: {
    backgroundColor: ISB_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  isbLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: ISB_COLORS.white,
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '800',
    color: ISB_COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroCode: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 16,
  },

  // Styles pour les dates en temps réel avec design ISB
  dateContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: ISB_COLORS.white,
    fontWeight: '500',
  },

  // Profile Section avec design ISB
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: ISB_COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ISB_COLORS.primary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: ISB_COLORS.gray,
    fontWeight: '500',
  },
  infoGrid: {
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: ISB_COLORS.gray,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ISB_COLORS.primary,
  },

  // Actions Section avec design ISB
  actionsCard: {
    backgroundColor: ISB_COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  actionButtons: {
    gap: 4,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginVertical: 2,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: ISB_COLORS.primary,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
    marginHorizontal: 56,
  },
  logoutButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  bottomSpace: {
    height: 40,
  },
});
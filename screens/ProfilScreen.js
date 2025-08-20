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
import DynamicHeader from './header';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');

export default function RequestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [profileAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [userInfo, setUserInfo] = useState(null);
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

  // Fonction pour calculer l'année académique
  const calculateAcademicYear = (date) => {
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0-11
    
    // Si nous sommes entre septembre et décembre, l'année académique commence cette année
    // Sinon, elle a commencé l'année précédente
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
    }, 1000); // Mise à jour chaque seconde

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

      console.log('[fetchProfileFromAPI] Appel API avec token:', token);

      const response = await fetch(`https://isbadmin.tn/api/getProfile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('[fetchProfileFromAPI] Status de la réponse:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          return null;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('[fetchProfileFromAPI] Données reçues:', data);

      if (data.etudiant) {
        return data.etudiant;
      } else {
        throw new Error('Données de profil invalides');
      }

    } catch (error) {
      console.log('[fetchProfileFromAPI] Erreur:', error.message);
      
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
    console.log('[fetchUserInfo] Début de la récupération des informations utilisateur...');
    setLoading(true);
    
    try {
      // Récupérer les données locales d'abord
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      // Ensuite récupérer les données depuis l'API
      const profileFromAPI = await fetchProfileFromAPI();
      
      if (profileFromAPI) {
        setProfileData(profileFromAPI);
        
        // Optionnel: mettre à jour les données locales avec les nouvelles données
        const updatedUserData = {
          ...JSON.parse(userData || '{}'),
          ...profileFromAPI
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserInfo(updatedUserData);
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
      console.log('[fetchUserInfo] Erreur:', error.message);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour nettoyer les données utilisateur
  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userToken',
        'userData',
        'userInfo',
      ]);
      console.log('[clearUserData] Données utilisateur supprimées');
    } catch (error) {
      console.log('[clearUserData] Erreur lors du nettoyage:', error);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const token = await AsyncStorage.getItem('userToken');
              
              if (!token) {
                await clearUserData();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
                return;
              }

              console.log('[handleLogout] Appel API logout avec token:', token);

              const response = await fetch(`https://isbadmin.tn/api/logout`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              });

              console.log('[handleLogout] Status de la réponse:', response.status);

              if (response.status === 200) {
                console.log('[handleLogout] Logout réussi');
                await clearUserData();
                
                Alert.alert(
                  'Déconnexion réussie',
                  'Vous avez été déconnecté avec succès',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }
                    }
                  ]
                );

              } else if (response.status === 401) {
                console.log('[handleLogout] Token invalide, nettoyage des données');
                await clearUserData();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });

              } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('[handleLogout] Erreur:', response.status, errorData);
                
                Alert.alert(
                  'Erreur',
                  'Une erreur est survenue lors de la déconnexion',
                  [
                    {
                      text: 'Forcer la déconnexion',
                      onPress: async () => {
                        await clearUserData();
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }
                    },
                    {
                      text: 'Annuler',
                      style: 'cancel'
                    }
                  ]
                );
              }

            } catch (error) {
              console.log('[handleLogout] Erreur réseau:', error.message);
              
              Alert.alert(
                'Erreur de connexion',
                'Impossible de contacter le serveur. Voulez-vous forcer la déconnexion ?',
                [
                  {
                    text: 'Forcer la déconnexion',
                    onPress: async () => {
                      await clearUserData();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    }
                  },
                  {
                    text: 'Annuler',
                    style: 'cancel'
                  }
                ]
              );
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

  const handleMakeRequest = () => {
    navigation.navigate('CreateRequest');
  };

  const handleTrackRequest = () => {
    navigation.navigate('TrackRequest');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Header title="Profile" withBackButton />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E40AF']}
            tintColor="#1E40AF"
            progressBackgroundColor="white"
          />
        }
        bounces={true}
      >
        {/* Hero Section Amélioré */}
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
            colors={['#1E3A8A', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              {/* Photo de profil avec effet de pulsation */}
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
                    <MaterialIcons name="person" size={60} color="white" />
                  </View>
                )}
                <View style={styles.profileImageBadge}>
                  <MaterialIcons name="verified" size={18} color="#10B981" />
                </View>
                <View style={styles.profileImageGlow} />
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
                  <Text style={styles.heroName}>
                    {profileData.nom} {profileData.prenom}
                  </Text>
                  
                  <Text style={styles.heroYear}>
                    📚 Année académique {profileData.annee}
                  </Text>
                  
                  {/* Section des dates en temps réel */}
                  <View style={styles.dateContainer}>
                    <View style={styles.dateItem}>
                      <MaterialIcons name="schedule" size={16} color="rgba(255, 255, 255, 0.9)" />
                      <Text style={styles.dateText}>
                        {formatCurrentDate()}
                      </Text>
                    </View>
                    
                    <View style={styles.dateItem}>
                      <MaterialIcons name="event" size={16} color="rgba(255, 255, 255, 0.9)" />
                      <Text style={styles.dateText}>
                        Année académique: {academicYear}
                      </Text>
                    </View>
                    
        
                  </View>
                </Animated.View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

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
                  <View style={styles.cardIconContainer}>
                    <MaterialIcons name="school" size={24} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Informations Académiques</Text>
                    <Text style={styles.cardSubtitle}>Détails de votre profil étudiant</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#EEF2FF' }]}>
                    <MaterialIcons name="person-outline" size={22} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Nom complet</Text>
                    <Text style={styles.infoValue}>
                      {profileData.nom} {profileData.prenom}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                    <MaterialIcons name="calendar-today" size={22} color="#16A34A" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Année académique</Text>
                    <Text style={styles.infoValue}>{profileData.annee}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialIcons name="grade" size={22} color="#D97706" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Niveau d'études</Text>
                    <Text style={styles.infoValue}>{profileData.id_niveau}éme Année</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Section Actions Améliorée */}
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
          {/* Menu d'actions secondaires */}
          <View style={styles.actionsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIconContainer}>
                  <MaterialIcons name="settings" size={24} color="#6366F1" />
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
                  <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
                    <MaterialIcons name="logout" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionButtonTextSecondary, { color: '#EF4444' }]}>
                    Se déconnecter
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
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
    backgroundColor: '#F8FAFC' 
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#6B7280',
    fontWeight: '500'
  },

  // Hero Section Amélioré
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
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    borderWidth: 5,
    borderColor: 'white',
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
  },
  profileImageBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'white',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: -1,
  },
  heroInfo: {
    alignItems: 'center',
  },
  heroName: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroTitleContainer: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  heroTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  heroYear: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 16,
  },

  // Styles pour les dates en temps réel
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginTop: 4,
  },
  timeText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    fontFamily: 'monospace',
  },

  // Profile Section Amélioré
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoGrid: {
    gap: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  quickActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  quickActionText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    flex: 1,
    marginLeft: 16,
  },

  // Actions Section Amélioré
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtons: {
    gap: 4,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FAFAFA',
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
    color: '#374151',
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
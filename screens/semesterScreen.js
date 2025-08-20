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
  Modal,
  Platform,
  StatusBar,
} from 'react-native';

import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DynamicHeader from './header';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';
import Icon from 'react-native-vector-icons/MaterialIcons'; // or MaterialCommunityIcons

const { width, height } = Dimensions.get('window');

// Palette de couleurs moderne
const COLORS = {
  primary: '#2563eb',       // Bleu moderne
  secondary: '#f59e0b',     // Jaune doré
  accent: '#8b5cf6',        // Violet
  success: '#10b981',       // Vert émeraude
  warning: '#f59e0b',       // Orange
  error: '#ef4444',         // Rouge
  background: '#fafafa',    // Fond très clair
  surface: '#ffffff',       // Surface blanche
  card: '#ffffff',          // Carte blanche
  text: '#1f2937',          // Texte principal
  textSecondary: '#6b7280', // Texte secondaire
  textLight: '#9ca3af',     // Texte léger
  border: '#e5e7eb',        // Bordure
  borderLight: '#f3f4f6',   // Bordure légère
};

export default function RequestScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loadingYears, setLoadingYears] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  const fetchSchoolYears = async () => {
    setLoadingYears(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        return;
      }

      const response = await fetch(`https://isbadmin.tn/api/getSchoolYears`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setSchoolYears(data.result);
        if (data.result.length > 0) {
          setSelectedYear(data.result[0].year);
        }
      } else {
        console.log('Erreur lors de la récupération des années:', data.error);
        Alert.alert('Erreur', 'Impossible de charger les années scolaires');
      }
    } catch (error) {
      console.log('Erreur réseau:', error);
      Alert.alert('Erreur', 'Problème de connexion réseau');
    } finally {
      setLoadingYears(false);
    }
  };

  const fetchUserInfo = async () => {
    console.log('[fetchUserInfo] Début de la récupération des informations utilisateur...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
      await fetchSchoolYears();

      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();

    } catch (error) {
      console.log('[fetchUserInfo] Erreur:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUserInfo();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserInfo();
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setDropdownVisible(false);
  };

  const handleSemesterPress = (semester) => {
    if (!selectedYear) {
      Alert.alert('Attention', 'Veuillez sélectionner une année scolaire');
      return;
    }
    
    navigation.navigate('Notes', {
      year: selectedYear,
      semester: semester
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <Header title="Notes" withBackButton />

      <DynamicHeader 
        title="Mes Notes"
        subtitle="Explorez vos résultats académiques"
        iconName="school"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Carte de sélection d'année moderne */}
        <Animated.View
          style={[
            styles.yearContainer,
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
          <View style={styles.yearHeader}>
            <View style={styles.yearIcon}>
      <Icon name="calendar-today" size={24} color="black" />
            </View>
            <View style={styles.yearText}>
              <Text style={styles.yearTitle}>Année scolaire</Text>
              <Text style={styles.yearSubtitle}>Sélectionnez votre période</Text>
            </View>
          </View>
          
          {loadingYears ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.yearSelector}
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorContent}>
                <View style={styles.selectorIcon}>
                  <MaterialIcons name="school" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.selectorText}>
                  {selectedYear || 'Choisir l\'année'}
                </Text>
                <MaterialIcons name="expand-more" size={22} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Modal de sélection amélioré */}
        <Modal
          visible={dropdownVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionner l'année</Text>
                <TouchableOpacity
                  onPress={() => setDropdownVisible(false)}
                  style={styles.modalClose}
                >
                  <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {schoolYears.map((year, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalItem,
                      selectedYear === year.year && styles.modalItemActive
                    ]}
                    onPress={() => handleYearSelect(year.year)}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      styles.yearBadge,
                      selectedYear === year.year && styles.yearBadgeActive
                    ]}>
                      <MaterialIcons 
                        name="school" 
                        size={16} 
                        color={selectedYear === year.year ? "white" : COLORS.primary} 
                      />
                    </View>
                    <Text style={[
                      styles.modalItemText,
                      selectedYear === year.year && styles.modalItemTextActive
                    ]}>
                      {year.year}
                    </Text>
                    {selectedYear === year.year && (
                      <View style={styles.checkIcon}>
                        <MaterialIcons name="check" size={18} color={COLORS.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Cartes des semestres redesignées */}
        {selectedYear && (
          <Animated.View
            style={[
              styles.semesterSection,
              {
                opacity: cardsAnim,
                transform: [{
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0]
                  })
                }]
              }
            ]}
          >
            {/* Titre de section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Semestres</Text>
              <Text style={styles.sectionSubtitle}>Année {selectedYear}</Text>
            </View>

            {/* Grille des semestres */}
            <View style={styles.semesterGrid}>
              {/* Semestre 1 */}
              <TouchableOpacity 
                style={styles.semesterCard}
                onPress={() => handleSemesterPress(1)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3b82f6', '#1d4ed8']}
                  style={styles.semesterGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.semesterTop}>
                    <View style={styles.semesterBadge}>
                      <Text style={styles.badgeText}>S1</Text>
                    </View>
                    <View style={styles.semesterIconBox}>
                      <MaterialIcons name="trending-up" size={16} color="white" />
                    </View>
                  </View>
                  
                  <View style={styles.semesterInfo}>
                    <Text style={styles.semesterTitle}>Premier</Text>
                    <Text style={styles.semesterTitle}>Semestre</Text>
                    <View style={styles.semesterLine} />
                  </View>

                  <View style={styles.semesterDecor}>
                    <MaterialCommunityIcons 
                      name="numeric-1-circle-outline" 
                      size={40} 
                      color="rgba(255, 255, 255, 0.2)" 
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Semestre 2 */}
              <TouchableOpacity 
                style={styles.semesterCard}
                onPress={() => handleSemesterPress(2)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.semesterGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.semesterTop}>
                    <View style={styles.semesterBadge}>
                      <Text style={styles.badgeText}>S2</Text>
                    </View>
                    <View style={styles.semesterIconBox}>
                      <MaterialIcons name="trending-up" size={16} color="white" />
                    </View>
                  </View>
                  
                  <View style={styles.semesterInfo}>
                    <Text style={styles.semesterTitle}>Deuxième</Text>
                    <Text style={styles.semesterTitle}>Semestre</Text>
                    <View style={styles.semesterLine} />
                  </View>

                  <View style={styles.semesterDecor}>
                    <MaterialCommunityIcons 
                      name="numeric-2-circle-outline" 
                      size={40} 
                      color="rgba(255, 255, 255, 0.2)" 
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: COLORS.background
  },

  content: { 
    paddingHorizontal: 16, 
    paddingBottom: 40, 
    paddingTop: 16,
  },

  // Sélecteur d'année moderne
  yearContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearIcon: {
    width: 36,
    height: 36,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  yearText: {
    flex: 1,
  },
  yearTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  yearSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  yearSelector: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorIcon: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Modal amélioré
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemActive: {
    backgroundColor: `${COLORS.primary}08`,
  },
  yearBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  yearBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkIcon: {
    width: 24,
    height: 24,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section des semestres
  semesterSection: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Grille des semestres
  semesterGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  semesterCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  semesterGradient: {
    padding: 16,
    minHeight: 140,
    position: 'relative',
  },
  semesterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  semesterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  semesterIconBox: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  semesterTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  semesterLine: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
    marginTop: 8,
  },
  semesterDecor: {
    position: 'absolute',
    right: -4,
    bottom: -4,
  },
});
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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DynamicHeader from './header';
import Header from '../components/Header';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');

export default function RequestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);

  const fetchUserInfo = async () => {
    console.log('[fetchUserInfo] Début de la récupération des informations utilisateur...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
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

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Header title="Demandes" withBackButton />
      

         <DynamicHeader 
        title="Mes Demandes"
        subtitle="Gestion des demandes administratives"
        iconName="file-document-multiple"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />


      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A', '#F59E0B']}
            tintColor="#1E3A8A"
          />
        }
      >
        <Animated.View
          style={[
            styles.cardsContainer,
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
          {/* Card Faire une demande - Couleurs IIT */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Creedemande')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <View style={styles.cardIconBg}>
                    <MaterialIcons name="add-circle" size={32} color="#F59E0B" />
                  </View>
                </View>
                
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Nouvelle Demande</Text>
                  <Text style={styles.cardSubtitle}>
                    Créer une demande administrative
                  </Text>
                  <View style={styles.cardFeatures}>
                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>Attestation de scolarité</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>Relevé de notes</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>Certificat de réussite</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardArrow}>
                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={20} color="#1E3A8A" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Card Suivre demande - Accent doré */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Recupererdemande')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F59E0B', '#FBBF24', '#FCD34D']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <View style={styles.cardIconBg}>
                    <MaterialIcons name="track-changes" size={32} color="#1E3A8A" />
                  </View>
                </View>
                
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#1E3A8A' }]}>
                    Suivre Demande
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: 'rgba(30, 58, 138, 0.8)' }]}>
                    Consulter le statut de vos demandes
                  </Text>
                  <View style={styles.cardFeatures}>
                    <View style={styles.featureItem}>
                      <View style={[styles.featureDot, { backgroundColor: '#1E3A8A' }]} />
                      <Text style={[styles.featureText, { color: '#1E3A8A' }]}>
                        Statut en temps réel
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={[styles.featureDot, { backgroundColor: '#1E3A8A' }]} />
                      <Text style={[styles.featureText, { color: '#1E3A8A' }]}>
                        Historique complet
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={[styles.featureDot, { backgroundColor: '#1E3A8A' }]} />
                      <Text style={[styles.featureText, { color: '#1E3A8A' }]}>
                        Notifications push
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardArrow}>
                  <View style={[styles.arrowContainer, { backgroundColor: '#1E3A8A' }]}>
                    <MaterialIcons name="arrow-forward" size={20} color="#F59E0B" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>




      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#374151' 
  },
  
  // Header amélioré
  headerContainer: {
    marginBottom: 10,
  },
  headerGradient: { 
    paddingVertical: 32, 
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: { 
    alignItems: 'center',
    zIndex: 2,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: { 
    color: 'rgba(255, 255, 255, 0.9)', 
    fontSize: 16, 
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backdropFilter: 'blur(10px)',
  },
  statItem: { 
    alignItems: 'center',
    flex: 1,
  },
  statNumber: { 
    color: '#F59E0B', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  statLabel: { 
    color: 'rgba(255, 255, 255, 0.9)', 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  decorativePattern: {
    position: 'absolute',
    right: -30,
    top: -30,
    zIndex: 1,
  },

  content: { 
    paddingHorizontal: 20, 
    paddingBottom: 40, 
    paddingTop: 20 
  },


  actionCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    minHeight: 180,
    position: 'relative',
  },
  cardContent: {
    
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    flex: 1,
  },
  cardIconContainer: {
    marginRight: 20,
  },
  cardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  cardTextContainer: {
    

    flex: 1,
  },
  cardTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    marginBottom: 12,
  },
  cardFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 10,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '400',
  },
  cardArrow: {
    marginLeft: 16,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    marginTop: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoContent: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoItemContent: {
    flex: 1,
    paddingTop: 2,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  infoItemText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Help section améliorée
  helpSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  helpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  helpButtonGradient: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  helpButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
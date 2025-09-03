import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import DynamicHeader from '../screens/header';
import axios from 'axios';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');

const documentTypes = {
  'AS': { 
    name: 'Attestation de scolarité', 
    icon: 'school',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#DBEAFE'
  },
  'RN': { 
    name: 'Relevé de notes', 
    icon: 'grade',
    color: '#10B981',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  'CR': { 
    name: 'Certificat de réussite', 
    icon: 'emoji-events',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  'DS': { 
    name: 'Demande de stage', 
    icon: 'business',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE'
  },
  'PAI': { 
    name: 'Projet académique individuel', 
    icon: 'assignment',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8'
  }
};

const statusConfig = {
  0: {
    label: 'En cours',
    icon: 'hourglass-empty',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8'
  },
  1: {
    label: 'Prêt',
    icon: 'check-circle',
    color: '#10B981',
    bgColor: '#D1FAE5',
    textColor: '#047857'
  },
  2: {
    label: 'Refusé',
    icon: 'cancel',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    textColor: '#DC2626'
  }
};

export default function DocumentsScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = plus récent d'abord, 'asc' = plus ancien d'abord

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();

      await fetchDocuments();
    } catch (error) {
      console.log('Erreur lors de l\'initialisation:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
        navigation.navigate('Login');
        return;
      }

      const response = await axios.get(
       `https://isbadmin.tn/api/getDocuments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Documents récupérés:', response.data);

      if (response.data.documents) {
        // Tri immédiat des documents par date (plus récent d'abord)
        const sortedDocuments = sortDocumentsByDate(response.data.documents, 'desc');
        setDocuments(sortedDocuments);
      } else {
        setDocuments([]);
      }

    } catch (error) {
      console.log('Erreur lors de la récupération des documents:', error);
      
      let errorMessage = 'Impossible de charger les documents';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          navigation.navigate('Login');
          return;
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
      } else if (error.request) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction de tri par date optimisée
  const sortDocumentsByDate = (docs, order = 'desc') => {
    return [...docs].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Vérification des dates valides
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  // Documents triés avec useMemo pour optimiser les performances
  const sortedDocuments = useMemo(() => {
    return sortDocumentsByDate(documents, sortOrder);
  }, [documents, sortOrder]);

  // Fonction pour basculer l'ordre de tri
  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
  };

  // Statistiques des documents avec useMemo
  const documentStats = useMemo(() => {
    const stats = {
      total: documents.length,
      enCours: 0,
      prets: 0,
      refuses: 0,
      recent: 0 // Documents des 7 derniers jours
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    documents.forEach(doc => {
      switch(doc.etat) {
        case 0: stats.enCours++; break;
        case 1: stats.prets++; break;
        case 2: stats.refuses++; break;
      }

      const docDate = new Date(doc.date);
      if (docDate >= sevenDaysAgo) {
        stats.recent++;
      }
    });

    return stats;
  }, [documents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    // Vérification de la validité de la date
    if (isNaN(date.getTime())) {
      return {
        date: 'Date invalide',
        time: '',
        relative: 'Date invalide'
      };
    }

    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let relative = '';
    if (diffDays === 0) {
      relative = "Aujourd'hui";
    } else if (diffDays === 1) {
      relative = 'Hier';
    } else if (diffDays < 7) {
      relative = `Il y a ${diffDays} jours`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      relative = `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      relative = `Il y a ${months} mois`;
    } else {
      const years = Math.floor(diffDays / 365);
      relative = `Il y a ${years} an${years > 1 ? 's' : ''}`;
    }

    return {
      date: date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      relative
    };
  };

  const getDocumentTypeInfo = (type) => {
    return documentTypes[type] || {
      name: 'Document inconnu',
      icon: 'description',
      color: '#6B7280',
      bgColor: '#F9FAFB',
      borderColor: '#E5E7EB'
    };
  };

  const getStatusInfo = (etat) => {
    return statusConfig[etat] || {
      label: 'État inconnu',
      icon: 'help',
      color: '#6B7280',
      bgColor: '#F9FAFB',
      textColor: '#374151'
    };
  };



  const renderSortHeader = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>
        {sortedDocuments.length} document{sortedDocuments.length > 1 ? 's' : ''}
      </Text>

    </View>
  );

  const renderDocument = ({ item, index }) => {
    const docInfo = getDocumentTypeInfo(item.type);
    const statusInfo = getStatusInfo(item.etat);
    const dateInfo = formatDate(item.date);

    return (
      <Animated.View
        style={[
          styles.documentCard,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FAFBFC']}
          style={styles.cardGradient}
        >
          <View style={styles.documentHeader}>
            <View style={[
              styles.documentIconContainer,
              { backgroundColor: docInfo.bgColor, borderColor: docInfo.borderColor }
            ]}>
              <MaterialIcons 
                name={docInfo.icon} 
                size={28} 
                color={docInfo.color}
              />
            </View>
            
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>{docInfo.name}</Text>
        
              <View style={styles.documentMeta}>
                <MaterialIcons name="event" size={14} color="#9CA3AF" />
                <Text style={styles.documentDateDetail}>
                  {dateInfo.date} à {dateInfo.time}
                </Text>
              </View>
            </View>

            <View style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.bgColor }
            ]}>
              <MaterialIcons 
                name={statusInfo.icon} 
                size={16} 
                color={statusInfo.color} 
              />
              <Text style={[
                styles.statusText,
                { color: statusInfo.textColor }
              ]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons name="folder-open" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>Aucun document</Text>
      <Text style={styles.emptySubtitle}>
        Vous n'avez pas encore de documents.{'\n'}
        Vos demandes apparaîtront ici une fois soumises.
      </Text>
    </View>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Header title="Mes documents" withBackButton />
      
      <DynamicHeader 
        title="Mes documents"
        subtitle={`${documents.length} demande${documents.length > 1 ? 's' : ''} au total`}
        iconName="folder-open"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <View style={styles.content}>
        
        <FlatList
          data={sortedDocuments}
          renderItem={renderDocument}
          keyExtractor={(item, index) => `${item.type}-${item.date}-${index}`}
          ListHeaderComponent={documents.length > 0 ? renderSortHeader : null}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            documents.length === 0 && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  statsContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 4,
  },

  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  documentCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  documentDate: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  documentDateDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
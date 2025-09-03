import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DynamicHeader from './header';
import Header from '../components/Header';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');
import { BASE_URL_APP } from '../api.js';

export default function ListeReclamationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  
  const [reclamations, setReclamations] = useState([]);
  const [reponses, setReponses] = useState([]);
  const [activeTab, setActiveTab] = useState('reclamations');
  
  const flatListRef = useRef();
  const [expandedCardId, setExpandedCardId] = useState(null);

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
    }
  };

  const fetchData = async () => {
    console.log('[fetchData] Début de la récupération des réclamations...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log("Token is null");
        throw new Error("Token is null");
      }

      const response = await fetch(`${BASE_URL_APP}/listeReclamation`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorResult = await response.json();
        console.log("Erreur dans la réponse:", errorResult);
        throw new Error(errorResult.message || 'Une erreur est survenue');
      }

      const result = await response.json();
      console.log("Résultat JSON:", result);
      
      if (result.success) {
        setReclamations(result.data.reclamations || []);
        setReponses(result.data.reponses || []);
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }

    } catch (error) {
      console.log("Erreur attrapée:", error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la récupération des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUserInfo(), fetchData()]);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (type) => {
    return type === 0 ? '#F59E0B' : '#10B981';
  };

  const getStatusText = (type) => {
    return type === 0 ? 'En attente' : 'Répondue';
  };

  const getStatusIcon = (type) => {
    return type === 0 ? 'schedule' : 'check-circle';
  };

  const toggleCardExpansion = (itemId, index) => {
    if (expandedCardId === itemId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(itemId);
      // Scroll to the card after a short delay to allow rendering
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: index,
          animated: true,
          viewPosition: 0.1
        });
      }, 150);
    }
  };

  // Fonction améliorée pour trouver la réponse correspondante à une réclamation
  const findResponseForReclamation = (reclamationId) => {
    return reponses.find(response => response.id_reclamation === reclamationId);
  };

  // Fonction pour trouver la réclamation correspondante à une réponse
  const findReclamationForResponse = (reclamationId) => {
    return reclamations.find(reclamation => reclamation.id === reclamationId);
  };

  // Fonction pour obtenir les réclamations avec leurs réponses (logique améliorée)
  const getReclamationsWithResponses = () => {
    return reclamations.map(reclamation => {
      const response = findResponseForReclamation(reclamation.id);
      return {
        ...reclamation,
        response: response,
        hasResponse: !!response,
        // Mise à jour du type basé sur la présence d'une réponse
        actualType: response ? 1 : reclamation.type
      };
    });
  };

  const renderReclamationCard = ({ item, index }) => {
    const isExpanded = expandedCardId === item.id;
    const { response, hasResponse, actualType } = item;
    
    return (
      <Animated.View
        style={[
          styles.reclamationCard,
          {
            opacity: cardsAnim,
            transform: [{
              translateY: cardsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20 + (index * 10), 0]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={hasResponse ? ['#FFFFFF', '#F0FDF9'] : ['#FFFFFF', '#FFFBF0']}
          style={styles.cardGradient}
        >
          {/* En-tête amélioré avec indicateur visuel */}
          <View style={styles.cardHeader}>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: `${getStatusColor(actualType)}15`,
                  borderWidth: 1,
                  borderColor: `${getStatusColor(actualType)}30`
                }
              ]}>
                <MaterialIcons 
                  name={getStatusIcon(actualType)} 
                  size={16} 
                  color={getStatusColor(actualType)} 
                />
                <Text style={[styles.statusText, { color: getStatusColor(actualType) }]}>
                  {getStatusText(actualType)}
                </Text>
              </View>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {formatDate(item.created_at)}
              </Text>
              {hasResponse && (
                <View style={styles.responseIndicatorBadge}>
                  <MaterialIcons name="reply" size={10} color="#10B981" />
                </View>
              )}
            </View>
          </View>

          {/* Contenu principal */}
          <View style={styles.cardContent}>
            <Text style={styles.reclamationTitle} numberOfLines={isExpanded ? 0 : 2}>
              {item.titre}
            </Text>
            <Text style={styles.reclamationContent} numberOfLines={isExpanded ? 0 : 3}>
              {item.contenue}
            </Text>
          </View>

          {/* Affichage de la réponse (logique améliorée) */}
          {isExpanded && hasResponse && (
            <Animated.View 
              style={[
                styles.responseContainer,
                {
                  opacity: isExpanded ? 1 : 0,
                  maxHeight: isExpanded ? 500 : 0,
                }
              ]}
            >
              <View style={styles.responseHeaderImproved}>
                <View style={styles.responseIconContainer}>
                  <MaterialIcons name="admin-panel-settings" size={18} color="#10B981" />
                </View>
                <View style={styles.responseInfo}>
                  <Text style={styles.responseTitle}>Réponse officielle</Text>
                  <Text style={styles.responseDate}>
                    {formatDate(response.created_at)}
                  </Text>
                </View>
                <View style={styles.responseStatusBadge}>
                  <MaterialIcons name="verified" size={12} color="#10B981" />
                  <Text style={styles.responseStatusText}>Traité</Text>
                </View>
              </View>
              <Text style={styles.responseContent}>
                {response.contenue || "Votre réclamation a été traitée. Aucun détail supplémentaire n'a été fourni."}
              </Text>
            </Animated.View>
          )}

          {/* Message d'attente amélioré */}
          {isExpanded && !hasResponse && actualType === 0 && (
            <View style={styles.pendingContainer}>
              <View style={styles.pendingIconContainer}>
                <MaterialIcons name="hourglass-empty" size={20} color="#F59E0B" />
              </View>
              <View style={styles.pendingTextContainer}>
                <Text style={styles.pendingTitle}>En cours de traitement</Text>
                <Text style={styles.pendingText}>
                  Votre réclamation est en attente de traitement par l'administration
                </Text>
              </View>
            </View>
          )}

          {/* Pied de carte amélioré */}
          <View style={styles.cardFooter}>
            <View style={styles.cardMetadata}>
              <View style={styles.cardId}>
                <MaterialIcons name="confirmation-number" size={14} color="#6B7280" />
                <Text style={styles.idText}>#{item.id}</Text>
              </View>
              {hasResponse && (
                <View style={styles.responseTime}>
                  <MaterialIcons name="schedule" size={12} color="#10B981" />
                  <Text style={styles.responseTimeText}>
                    Répondu en {Math.ceil((new Date(response.created_at) - new Date(item.created_at)) / (1000 * 60 * 60 * 24))} jour(s)
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                  styles.expandButton, 
                  isExpanded && styles.expandButtonActive,
                  hasResponse && styles.expandButtonWithResponse
                ]}
                onPress={() => toggleCardExpansion(item.id, index)}
              >
                <Text style={[
                  styles.expandButtonText, 
                  isExpanded && styles.expandButtonTextActive,
                  hasResponse && styles.expandButtonTextWithResponse
                ]}>
                  {isExpanded ? 'Réduire' : hasResponse ? 'Voir réponse' : 'Détails'}
                </Text>
                <MaterialIcons 
                  name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={16} 
                  color={
                    isExpanded ? "#F59E0B" : 
                    hasResponse ? "#10B981" : 
                    "#3B82F6"
                  } 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderResponseCard = ({ item, index }) => {
    const isExpanded = expandedCardId === item.id;
    const originalReclamation = findReclamationForResponse(item.id_reclamation);
    
    return (
      <Animated.View
        style={[
          styles.reclamationCard,
          {
            opacity: cardsAnim,
            transform: [{
              translateY: cardsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20 + (index * 10), 0]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['#F0FDF9', '#FFFFFF']}
          style={styles.cardGradient}
        >
          <View style={styles.responseCardHeader}>
            <View style={styles.responseCardBadge}>
              <MaterialIcons name="admin-panel-settings" size={16} color="#10B981" />
              <Text style={styles.responseCardBadgeText}>Réponse officielle</Text>
            </View>
            <Text style={styles.dateText}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.responseCardTitle}>
              {originalReclamation?.titre || `Réponse à la réclamation #${item.id_reclamation}`}
            </Text>
            {originalReclamation && (
              <Text style={styles.originalReclamationText} numberOfLines={2}>
                Réclamation originale: {originalReclamation.contenue}
              </Text>
            )}
            <Text style={styles.responseCardContent} numberOfLines={isExpanded ? 0 : 4}>
              {item.contenue || "Réponse de l'administration concernant votre réclamation."}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.cardId}>
              <MaterialIcons name="reply" size={14} color="#10B981" />
              <Text style={[styles.idText, { color: '#10B981' }]}>
                Réf: #{item.id_reclamation}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.expandButton, styles.expandButtonResponse, isExpanded && styles.expandButtonActive]}
              onPress={() => toggleCardExpansion(item.id, index)}
            >
              <Text style={[
                styles.expandButtonText, 
                styles.expandButtonTextResponse,
                isExpanded && styles.expandButtonTextActive
              ]}>
                {isExpanded ? 'Réduire' : 'Lire plus'}
              </Text>
              <MaterialIcons 
                name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={16} 
                color={isExpanded ? "#F59E0B" : "#10B981"} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons 
          name={activeTab === 'reclamations' ? 'inbox' : 'mark-email-read'} 
          size={64} 
          color="#D1D5DB" 
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'reclamations' ? 'Aucune réclamation' : 'Aucune réponse'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'reclamations' 
          ? 'Commencez par créer votre première réclamation'
          : 'Les réponses de l\'administration apparaîtront ici'
        }
      </Text>
    </View>
  );

  if (loading) {
    return <Loading />;
  }

  // Utilisation des données améliorées pour les réclamations
  const currentData = activeTab === 'reclamations' 
    ? getReclamationsWithResponses() 
    : reponses;
  const renderItem = activeTab === 'reclamations' ? renderReclamationCard : renderResponseCard;

  return (
    <View style={styles.container}>
      <Header title="Mes Réclamations" withBackButton />
      
      <DynamicHeader 
        title="Liste des Réclamations"
        subtitle={`${reclamations.length} réclamation${reclamations.length > 1 ? 's' : ''} • ${reponses.length} réponse${reponses.length > 1 ? 's' : ''}`}
        iconName="format-list-bulleted"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      {/* Tabs améliorés */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reclamations' && styles.activeTab]}
          onPress={() => {
            setActiveTab('reclamations');
            setExpandedCardId(null); // Reset expanded state when switching tabs
          }}
        >
          <MaterialIcons 
            name="report-problem" 
            size={20} 
            color={activeTab === 'reclamations' ? '#F59E0B' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'reclamations' && styles.activeTabText
          ]}>
            Réclamations ({reclamations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reponses' && styles.activeTab]}
          onPress={() => {
            setActiveTab('reponses');
            setExpandedCardId(null); // Reset expanded state when switching tabs
          }}
        >
          <MaterialIcons 
            name="reply" 
            size={20} 
            color={activeTab === 'reponses' ? '#10B981' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'reponses' && styles.activeTabText
          ]}>
            Réponses ({reponses.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A', '#F59E0B']}
            tintColor="#1E3A8A"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />

      {/* Floating Action Button amélioré */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          if (navigation.getState().routeNames.includes('CreerReclamation')) {
            navigation.navigate('CreerReclamation');
          } else {
            Alert.alert('Information', 'La page de création n\'est pas disponible');
          }
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#F59E0B', '#FBBF24']}
          style={styles.fabGradient}
        >
          <MaterialIcons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#FEF3C7',
    shadowColor: "#F59E0B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#F59E0B',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
  },
  reclamationCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  responseIndicatorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginBottom: 18,
  },
  reclamationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    lineHeight: 26,
  },
  reclamationContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  // Styles améliorés pour les réponses
  responseContainer: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    overflow: 'hidden',
  },
  responseHeaderImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  responseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseInfo: {
    flex: 1,
  },
  responseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  responseDate: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  responseStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responseStatusText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '700',
  },
  responseContent: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 22,
    fontWeight: '500',
  },
  // Styles améliorés pour l'état d'attente
  pendingContainer: {
    backgroundColor: '#FFFBEB',
    padding: 20,
    borderRadius: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pendingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 13,
    color: '#D97706',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardMetadata: {
    flex: 1,
  },
  cardId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  idText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseTimeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  expandButtonActive: {
    backgroundColor: '#FEF3C7',
  },
  expandButtonWithResponse: {
    backgroundColor: '#D1FAE5',
  },
  expandButtonResponse: {
    backgroundColor: '#D1FAE5',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
  },
  expandButtonTextActive: {
    color: '#F59E0B',
  },
  expandButtonTextWithResponse: {
    color: '#10B981',
  },
  expandButtonTextResponse: {
    color: '#10B981',
  },
  // Styles pour les cartes de réponses
  responseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  responseCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  responseCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  responseCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 10,
    lineHeight: 24,
  },
  originalReclamationText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
  },
  responseCardContent: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 22,
    fontWeight: '500',
  },
  // État vide amélioré
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  // FAB amélioré
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: "#F59E0B",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
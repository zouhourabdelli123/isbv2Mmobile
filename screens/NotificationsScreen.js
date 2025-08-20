import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  TextInput,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Linking
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import DynamicHeader from './header';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Configuration API
const API_BASE_URL = Platform.OS === 'ios' ? 'https://iitadmin.tn' : 'https://iitadmin.tn';

// Fonctions utilitaires
const getNotificationIcon = (title) => {
  if (!title) return 'notifications-outline';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('demande')) return 'document-text-outline';
  if (lowerTitle.includes('validation')) return 'checkmark-circle-outline';
  if (lowerTitle.includes('rejet')) return 'close-circle-outline';
  if (lowerTitle.includes('message')) return 'mail-outline';
  if (lowerTitle.includes('urgent')) return 'warning-outline';
  return 'notifications-outline';
};

const getNotificationColor = (title) => {
  if (!title) return '#3B82F6';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('validation')) return '#10B981';
  if (lowerTitle.includes('rejet')) return '#EF4444';
  if (lowerTitle.includes('urgent')) return '#F59E0B';
  if (lowerTitle.includes('message')) return '#8B5CF6';
  return '#3B82F6';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '';
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '';
  }
};

// Fonction améliorée pour traiter le HTML (garde la même logique d'affichage)
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n') // Remplace <br> par des retours à la ligne
    .replace(/<\/p>/gi, '\n\n') // Remplace </p> par double retour à la ligne
    .replace(/<p[^>]*>/gi, '') // Supprime les balises <p>
    .replace(/<[^>]*>/g, '') // Enlève les autres balises HTML
    .replace(/\s+/g, ' ') // Réduit les espaces multiples
    .replace(/\n\s+/g, '\n') // Nettoie les espaces après les retours à la ligne
    .trim();
};

// Composant pour afficher le texte avec les liens cliquables
const RenderTextWithLinks = ({ text, style }) => {
  const openLink = (url) => {
    try {
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = `https://${url}`;
      }
      
      Alert.alert(
        'Ouvrir le lien',
        `Voulez-vous ouvrir ce lien ?\n${finalUrl}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Ouvrir', 
            onPress: () => Linking.openURL(finalUrl).catch(err => {
              console.log('Erreur lors de l\'ouverture du lien:', err);
              Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
            })
          }
        ]
      );
    } catch (error) {
      console.log('Erreur lors du traitement du lien:', error);
      Alert.alert('Erreur', 'Lien non valide');
    }
  };

  // Regex pour détecter les URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <Text
              key={index}
              style={styles.linkText}
              onPress={() => openLink(part)}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

const groupNotificationsByDate = (notifications) => {
  const groups = {};
  
  notifications.forEach(notification => {
    const dateKey = new Date(notification.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(notification);
  });
  
  return Object.keys(groups)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(dateKey => ({
      dateKey,
      dateLabel: getDateLabel(dateKey),
      notifications: groups[dateKey].sort((a, b) => new Date(b.date) - new Date(a.date))
    }));
};

const getDateLabel = (dateString) => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date label:', error);
    return dateString;
  }
};

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [searchAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loadingExpand, setLoadingExpand] = useState(new Set());
  const [fullTexts, setFullTexts] = useState({});

  // Charger les infos utilisateur et les notifications
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les infos utilisateur
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
        
        // Animation d'entrée
        Animated.sequence([
          Animated.timing(slideAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(searchAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(cardsAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();
        
        // Charger les notifications
        await fetchNotifications();
      } catch (error) {
        console.log('Error loading data:', error);
        Alert.alert('Erreur', 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrer les notifications selon la recherche
  useEffect(() => {
    if (!searchQuery) {
      setFilteredNotifications(notifications);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notifications.filter(notif => 
      (notif.title?.toLowerCase().includes(query) ||
       notif.type?.toLowerCase().includes(query))
    );
    
    setFilteredNotifications(filtered);
  }, [searchQuery, notifications]);

  // Récupérer les détails d'une notification
  const fetchNotificationDetails = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token non trouvé');
      }

      const response = await fetch(`${API_BASE_URL}/api/afficheNotif/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // Timeout de 10 secondes
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Error fetching notification details:', error);
      
      // Gestion d'erreurs plus spécifique
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Problème de connexion réseau');
      } else if (error.message.includes('timeout')) {
        throw new Error('Délai d\'attente dépassé');
      } else if (error.message.includes('401')) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      } else {
        throw new Error(`Erreur lors du chargement: ${error.message}`);
      }
    }
  };

  // Charger les notifications
  const fetchNotifications = async (loadMore = false) => {
    if (loadMore) {
      if (!hasMore || isLoadingMore) return;
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token non trouvé');
      }

      const currentPage = loadMore ? page : 0;
      
      const response = await fetch(`${API_BASE_URL}/api/getNotifications?index=${currentPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const newNotifications = data.notifications || [];

      setNotifications(prev => 
        loadMore ? [...prev, ...newNotifications] : newNotifications
      );
      
      setHasMore(newNotifications.length === 5);
      if (loadMore) setPage(p => p + 1);
    } catch (error) {
      console.log("Fetch notifications error:", error);
      
      if (!loadMore) {
        Alert.alert(
          'Erreur', 
          error.message.includes('Network request failed') 
            ? 'Problème de connexion. Vérifiez votre connexion internet.' 
            : 'Impossible de charger les notifications'
        );
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Rafraîchir les notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setExpandedIds(new Set());
    setFullTexts({});
    await fetchNotifications();
    setRefreshing(false);
  };

  // Charger plus de notifications
  const handleLoadMore = () => {
    if (!searchQuery && hasMore) {
      fetchNotifications(true);
    }
  };

  // Développer/réduire une notification
  const toggleExpand = async (id) => {
    if (expandedIds.has(id)) {
      setExpandedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return;
    }

    if (fullTexts[id]) {
      setExpandedIds(prev => new Set(prev.add(id)));
      return;
    }

    setLoadingExpand(prev => new Set(prev.add(id)));
    
    try {
      const details = await fetchNotificationDetails(id);
      
      if (details && details.text) {
        setFullTexts(prev => ({ ...prev, [id]: details.text }));
        setNotifications(prev => prev.map(notif => 
          notif.id === id ? { ...notif, etat: 1 } : notif
        ));
        setExpandedIds(prev => new Set(prev.add(id)));
      } else {
        Alert.alert('Information', 'Aucun détail supplémentaire disponible');
      }
    } catch (error) {
      console.log("Error expanding notification:", error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les détails');
    } finally {
      setLoadingExpand(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Rendu d'une notification
  const renderItem = ({ item }) => {
    const isExpanded = expandedIds.has(item.id);
    const isLoadingDetails = loadingExpand.has(item.id);
    const icon = getNotificationIcon(item.title);
    const color = getNotificationColor(item.title);
    const fullText = fullTexts[item.id] || item.text || item.title || '';
    const displayText = stripHtml(fullText);
    const shortText = displayText.substring(0, 15);
    const showExpand = displayText.length > 15 || (item.text && item.text.length > 15);
    const isRead = item.etat === 1;

    return (
      <Animated.View 
        style={[
          styles.card,
          {
            opacity: cardsAnim,
            transform: [{
              translateY: cardsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,1)']}
          style={styles.cardGradient}
        />
        
        <View style={[styles.statusBar, { backgroundColor: color }]} />
        
        <View style={styles.cardHeader}>
          <View style={[styles.icon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          
          <View style={styles.headerText}>
            <Text 
              style={[
                styles.title,
                isRead ? styles.readTitle : styles.unreadTitle
              ]}
              numberOfLines={2}
            >
              {stripHtml(item.title) || 'Notification sans titre'}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{formatTime(item.date)}</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
              {item.type && (
                <>
                  <Text style={styles.metaText}>•</Text>
                  <Text style={styles.metaText}>{item.type}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.contentScroll}
          nestedScrollEnabled
          scrollEnabled={isExpanded}
        >
          <RenderTextWithLinks 
            text={isExpanded || !showExpand ? displayText : `${shortText}...`}
            style={styles.content}
          />
        </ScrollView>

        {showExpand && (
          <TouchableOpacity 
            style={[styles.expandButton, { borderColor: `${color}20` }]}
            onPress={() => toggleExpand(item.id)}
            disabled={isLoadingDetails}
          >
            {isLoadingDetails ? (
              <>
                <ActivityIndicator size="small" color={color} />
                <Text style={[styles.expandText, { color, marginLeft: 8 }]}>
                  Chargement...
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.expandText, { color }]}>
                  {isExpanded ? 'Voir moins' : 'Voir plus'}
                </Text>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={color} 
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Rendu d'un groupe de notifications par date
  const renderGroup = ({ item: group }) => (
    <View style={styles.group} key={group.dateKey}>
      <View style={styles.groupHeader}>
        <Ionicons name="calendar" size={16} color="#3B82F6" style={styles.calendarIcon} />
        <Text style={styles.groupTitle}>{group.dateLabel}</Text>
      </View>
      {group.notifications.map((item, index) => (
        <View key={`${item.id}_${index}`} style={styles.itemContainer}>
          {renderItem({ item })}
        </View>
      ))}
    </View>
  );

  // Rendu quand il n'y a pas de notifications
  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons 
        name={searchQuery ? "search-outline" : "notifications-off-outline"} 
        size={48} 
        color="#CBD5E1" 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? "Aucun résultat trouvé" : "Aucune notification"}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery 
          ? `Aucune notification ne correspond à "${searchQuery}"`
          : "Vous n'avez pas de nouvelles notifications pour le moment."
        }
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Effacer la recherche</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const groupedData = groupNotificationsByDate(filteredNotifications);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header title="Notifications" withBackButton />

      <DynamicHeader 
        title="Mes notifications"
        subtitle="Gestion des demandes administratives"
        iconName="file-document-multiple"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            transform: [{
              translateY: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0]
              })
            }]
          }
        ]}
      >
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des notifications..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={renderGroup}
          keyExtractor={(group) => group.dateKey}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3B82F6"]}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.footerText}>Chargement...</Text>
              </View>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  group: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarIcon: {
    marginRight: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  unreadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  readTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 8,
  },
  contentScroll: {
    maxHeight: 200,
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
});

export default NotificationScreen;
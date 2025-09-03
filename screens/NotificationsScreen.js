import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TextInput,
  Platform,
  FlatList,
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

const { width, height } = Dimensions.get('window');

// Configuration API
import { BASE_URL_APP } from '../api.js';

// Fonctions utilitaires
const getNotificationIcon = (title) => {
  if (!title) return 'notifications-outline';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('demande')) return 'document-text-outline';
  if (lowerTitle.includes('validation') || lowerTitle.includes('approuvé')) return 'checkmark-circle-outline';
  if (lowerTitle.includes('rejet') || lowerTitle.includes('refus')) return 'close-circle-outline';
  if (lowerTitle.includes('message')) return 'mail-outline';
  if (lowerTitle.includes('urgent')) return 'warning-outline';
  if (lowerTitle.includes('information')) return 'information-circle-outline';
  return 'notifications-outline';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '';
  }
};

// Fonction pour traiter le HTML - CORRIGÉE
const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  try {
    // D'abord, décoder les entités HTML
    let text = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&eacute;/g, 'é')
      .replace(/&egrave;/g, 'è')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&agrave;/g, 'à')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&ucirc;/g, 'û')
      .replace(/&icirc;/g, 'î');
    
    // Ensuite, supprimer les balises HTML tout en préservant le texte
    text = text.replace(/<[^>]*>/g, '');
    
    // Nettoyer les espaces multiples et les sauts de ligne
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error stripping HTML:', error);
    return html.toString();
  }
};

// Fonction pour compter les mots
const getWordCount = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Composant pour afficher le texte avec les liens cliquables - AMÉLIORÉ
const RenderTextWithLinks = ({ text, style, numberOfLines }) => {
  const openLink = useCallback((url) => {
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
            onPress: () => Linking.openURL(finalUrl).catch(() => {
              Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
            })
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Lien non valide');
    }
  }, []);

  if (!text) return null;

  // Regex améliorée pour détecter plus de types d'URLs
  const urlRegex = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+\.[^\s<>]+|[^\s<>]+\.[^\s<>]{2,}(?:\/[^\s<>]*)?)/gi;
  const parts = text.split(urlRegex);
  
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <Text
              key={index}
              style={styles.linkTextInContent}
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

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
        
        await fetchNotifications();
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        Alert.alert('Erreur', 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrer les notifications avec optimisation
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotifications(notifications);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = notifications.filter(notif => {
      const title = stripHtml(notif.title || '').toLowerCase();
      const content = stripHtml(notif.content || '').toLowerCase();
      const link = (notif.link || '').toLowerCase();
      
      return title.includes(query) || 
             content.includes(query) || 
             link.includes(query);
    });
    
    setFilteredNotifications(filtered);
  }, [searchQuery, notifications]);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
        navigation.navigate('Login');
        return;
      }

      const response = await Promise.race([
        fetch(`https://isbadmin.tn/api/getNotifications`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        )
      ]);

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
          navigation.navigate('Login');
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      let notificationsData = [];
      
      if (data.notifications && Array.isArray(data.notifications)) {
        notificationsData = data.notifications;
      } else if (Array.isArray(data)) {
        notificationsData = data;
      }
      
      const formattedNotifications = notificationsData.map((notif, index) => ({
        id: notif.id || `notif_${index}_${Date.now()}`,
        title: notif.title || 'Notification',
        content: notif.text || notif.content || '',
        type: 'general',
        date: notif.date || notif.created_at || new Date().toISOString(),
        etat: notif.etat || 0,
        priority: notif.priority || 'normal',
        link: notif.link || null
      }));
      
      // Trier par date (plus récent en premier)
      formattedNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setNotifications(formattedNotifications);
      
      // AFFICHER LES NOTIFICATIONS DANS LA CONSOLE
      console.log("=== NOTIFICATIONS RECEIVED ===");
      console.log("Nombre total de notifications:", formattedNotifications.length);
      console.log("Notifications non lues:", formattedNotifications.filter(n => n.etat === 0).length);
      console.log("Détail des notifications:");
      formattedNotifications.forEach((notif, index) => {
        console.log(`\n--- Notification ${index + 1} ---`);
        console.log("ID:", notif.id);
        console.log("Titre:", notif.title);
        console.log("Contenu:", notif.content);
        console.log("Date:", notif.date);
        console.log("État:", notif.etat === 0 ? "Non lu" : "Lu");
        console.log("Priorité:", notif.priority);
        console.log("Lien:", notif.link || "Aucun");
      });
      console.log("==============================");
      
      const unreadCount = formattedNotifications.filter(n => n.etat === 0).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error("Fetch notifications error:", error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setExpandedIds(new Set());
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Barre de recherche - OPTIMISÉE
  const SearchBar = useCallback(() => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <View style={styles.searchIconWrapper}>
          <Ionicons name="search" size={20} color="#2738a5ff" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher dans les notifications..."
          placeholderTextColor="#A1A1AA"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#A1A1AA" />
          </TouchableOpacity>
        )}
      </View>
      
      {searchQuery.length > 0 && (
        <View style={styles.searchResultsIndicator}>
          <Text style={styles.searchResultsText}>
            {filteredNotifications.length} résultat{filteredNotifications.length > 1 ? 's' : ''} trouvé{filteredNotifications.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  ), [searchQuery, filteredNotifications.length]);

  // Rendu des notifications - OPTIMISÉ
  const renderNotification = useCallback(({ item, index }) => {
    const isExpanded = expandedIds.has(item.id);
    const icon = getNotificationIcon(item.title);
    const cleanTitle = stripHtml(item.title || 'Sans titre');
    const cleanContent = stripHtml(item.content || '');
    const wordCount = getWordCount(cleanContent);
    const isLongContent = wordCount > 30 || cleanContent.length > 200;
    const isRead = item.etat === 1;
    const shouldShowExpand = isLongContent;

    // Déterminer la couleur de l'icône selon le type
    const getIconColor = () => {
      if (item.priority === 'high') return '#EF4444';
      if (cleanTitle.toLowerCase().includes('validation') || cleanTitle.toLowerCase().includes('approuvé')) return '#10B981';
      if (cleanTitle.toLowerCase().includes('rejet') || cleanTitle.toLowerCase().includes('refus')) return '#EF4444';
      if (cleanTitle.toLowerCase().includes('urgent')) return '#F59E0B';
      return '#2738a5ff';
    };

    const iconColor = getIconColor();

    return (
      <View style={[styles.notificationCard, !isRead && styles.unreadCard]}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => shouldShowExpand && toggleExpand(item.id)}
          style={styles.cardTouchable}
        >
          {/* Indicateur de statut */}
          {!isRead && <View style={[styles.unreadIndicator, { backgroundColor: iconColor }]} />}
          
          {/* En-tête de la notification */}
          <View style={styles.notifHeader}>
            <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
              <Ionicons name={icon} size={22} color="#FFFFFF" />
            </View>
            
            <View style={styles.notifHeaderText}>
              <Text style={[styles.notifTitle, !isRead && styles.unreadNotifTitle]} numberOfLines={2}>
                {cleanTitle}
              </Text>
              <Text style={styles.notifDate}>
                {formatDate(item.date)}
              </Text>
            </View>
            
            {item.priority === 'high' && (
              <View style={styles.urgentBadge}>
                <Ionicons name="warning" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Contenu de la notification */}
          {cleanContent && (
            <View style={styles.notifContent}>
              {isExpanded ? (
                <View style={styles.expandedContentContainer}>
                  <ScrollView 
                    style={styles.fullContentScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={isLongContent}
                    contentContainerStyle={styles.scrollContent}
                  >
                    <RenderTextWithLinks 
                      text={cleanContent}
                      style={styles.fullContentText}
                    />
                  </ScrollView>
            
                </View>
              ) : (
                <View>
                  <RenderTextWithLinks 
                    text={cleanContent.length > 120 ? cleanContent.substring(0, 120) + '...' : cleanContent}
                    style={styles.previewText}
                    numberOfLines={3}
                  />
            
                </View>
              )}
            </View>
          )}

          {/* Lien si disponible */}
          {item.link && (
            <TouchableOpacity 
              style={styles.linkContainer}
              onPress={() => {
                Alert.alert(
                  'Ouvrir le lien',
                  'Voulez-vous ouvrir ce lien externe ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { 
                      text: 'Ouvrir', 
                      onPress: () => Linking.openURL(item.link).catch(() => 
                        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien')
                      )
                    }
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={16} color="#2738a5ff" />
              <Text style={styles.linkText} numberOfLines={1}>
                Ouvrir le lien
              </Text>
              <Ionicons name="open-outline" size={14} color="#2738a5ff" />
            </TouchableOpacity>
          )}

          {/* Actions */}
          {shouldShowExpand && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.expandBtn}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandBtnText}>
                  {isExpanded ? 'Réduire' : 'Lire plus'}
                </Text>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#2738a5ff" 
                />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [expandedIds, toggleExpand]);

  // État vide - OPTIMISÉ
  const EmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9']}
        style={styles.emptyIconContainer}
      >
        <Ionicons 
          name={searchQuery ? "search-outline" : "notifications-off-outline"} 
          size={48} 
          color="#2738a5ff" 
        />
      </LinearGradient>
      
      <Text style={styles.emptyTitle}>
        {searchQuery ? "Aucun résultat trouvé" : "Aucune notification"}
      </Text>
      
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `Aucune notification ne correspond à "${searchQuery}"`
          : "Vous n'avez pas de nouvelles notifications pour le moment"
        }
      </Text>
      
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
          activeOpacity={0.8}
        >
          <Text style={styles.clearSearchButtonText}>Effacer la recherche</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const ItemSeparatorComponent = useCallback(() => <View style={styles.separator} />, []);

  return (
    <View style={styles.container}>
      <Header title="Notifications" withBackButton />

      <DynamicHeader 
        title="Mes notifications"
        subtitle={`Gestion des demandes administratives`}
        iconName="bell-outline"
        userInfo={userInfo}
      />

      <SearchBar />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#2738a5ff" />
          </View>
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContainer,
            filteredNotifications.length === 0 && styles.emptyListContainer
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2738a5ff"]}
              tintColor="#2738a5ff"
              title="Actualisation..."
              titleColor="#2738a5ff"
            />
          }
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparatorComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={6}
          getItemLayout={(data, index) => ({
            length: 200,
            offset: 216 * index,
            index,
          })}
        />
      )}
    </View>
  );
};

// Styles - OPTIMISÉS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  
  // Styles de la barre de recherche
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  searchIconWrapper: {
    marginRight: 12,
    padding: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#18181B',
    fontWeight: '500',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearSearchBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  searchResultsIndicator: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  searchResultsText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  
  // Styles de la liste
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  separator: {
    height: 16,
  },
  
  // Styles des cartes de notification
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 0,
  },
  unreadCard: {
    borderColor: '#E0E7FF',
    backgroundColor: '#FEFFFE',
  },
  cardTouchable: {
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 1,
  },
  
  // Styles de l'en-tête de notification
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifHeaderText: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
    lineHeight: 22,
    marginBottom: 4,
  },
  unreadNotifTitle: {
    color: '#18181B',
    fontWeight: '700',
  },
  notifDate: {
    fontSize: 13,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  urgentBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Styles du contenu
  notifContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  expandedContentContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  previewText: {
    fontSize: 15,
    color: '#52525B',
    lineHeight: 22,
  },
  fullContentScroll: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  fullContentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'left',
  },
  linkTextInContent: {
    color: '#2738a5ff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  
  // Styles des actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expandBtnText: {
    fontSize: 14,
    color: '#2738a5ff',
    fontWeight: '600',
    marginRight: 6,
  },
  
  // Styles des liens
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkText: {
    color: '#2738a5ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  
  // Styles de l'état vide
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    minHeight: height * 0.5,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  clearSearchButton: {
    marginTop: 24,
    backgroundColor: '#2738a5ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Styles de chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#71717A',
    fontWeight: '500',
  },
});

export default NotificationScreen;
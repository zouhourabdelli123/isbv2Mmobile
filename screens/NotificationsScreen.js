import React, {
  useState,
  useEffect,
  useCallback
} from "react";
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
  Alert,
  Linking
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation
} from '@react-navigation/native';
import {
  Ionicons
} from '@expo/vector-icons';
import Header from '../components/Header';
import DynamicHeader from './header';
import {
  LinearGradient
} from 'expo-linear-gradient';

const {
  width
} = Dimensions.get('window');

// Fonctions utilitaires
const getNotificationIcon = (title) => {
  if (!title) return 'notifications-outline';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('demande')) return 'document-text-outline';
  if (lowerTitle.includes('validation')) return 'checkmark-circle-outline';
  if (lowerTitle.includes('rejet')) return 'close-circle-outline';
  if (lowerTitle.includes('message')) return 'mail-outline';
  if (lowerTitle.includes('urgent')) return 'warning-outline';
  if (lowerTitle.includes('paiement')) return 'card-outline';
  if (lowerTitle.includes('note')) return 'school-outline';
  if (lowerTitle.includes('document')) return 'document-outline';
  return 'notifications-outline';
};

const getNotificationColor = (title) => {
  if (!title) return '#3B82F6';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('validation') || lowerTitle.includes('accepté')) return '#10B981';
  if (lowerTitle.includes('rejet') || lowerTitle.includes('refusé')) return '#EF4444';
  if (lowerTitle.includes('urgent') || lowerTitle.includes('important')) return '#F59E0B';
  if (lowerTitle.includes('message') || lowerTitle.includes('information')) return '#8B5CF6';
  if (lowerTitle.includes('paiement')) return '#EC4899';
  if (lowerTitle.includes('note')) return '#06B6D4';
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

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Enlève les balises HTML
    .replace(/&nbsp;/g, ' ') // Remplace &nbsp; par espace
    .replace(/&amp;/g, '&') // Remplace &amp; par &
    .replace(/&lt;/g, '<') // Remplace &lt; par <
    .replace(/&gt;/g, '>') // Remplace &gt; par >
    .replace(/&quot;/g, '"') // Remplace &quot; par "
    .replace(/\s+/g, ' ') // Réduit les espaces multiples
    .trim();
};

const extractLinks = (text) => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

const groupNotificationsByDate = (notifications) => {
  if (!notifications || notifications.length === 0) return [];

  const groups = {};

  notifications.forEach(notification => {
    if (!notification || !notification.date) return;

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

  const [expandedNotifications, setExpandedNotifications] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }

        // Animation séquentielle
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(searchAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
          }),
          Animated.timing(cardsAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
          }),
        ]).start();

        await fetchNotifications();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotifications(notifications);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = notifications.filter(notif => {
      if (!notif) return false;

      const title = notif.title?.toLowerCase() || '';
      const type = notif.type?.toLowerCase() || '';
      const text = stripHtml(notif.text || '').toLowerCase();

      return title.includes(query) ||
        type.includes(query) ||
        text.includes(query);
    });

    setFilteredNotifications(filtered);
  }, [searchQuery, notifications]);

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
        throw new Error('Token d\'authentification non trouvé');
      }

      const currentPage = loadMore ? page + 1 : 1;

      const response = await fetch(`https://isbadmin.tn/api/getNotifications?page=${currentPage}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || 'Erreur serveur'}`);
      }

      const data = await response.json();

      if (!data || !data.notifications) {
        throw new Error('Format de réponse invalide');
      }

      const newNotifications = Array.isArray(data.notifications) ? data.notifications : [];

      // Nettoyer et formater les données
      const formattedNotifications = newNotifications.map(notification => ({
        ...notification,
        text: stripHtml(notification.text || notification.content || ''),
        title: notification.title || 'Notification sans titre'
      }));

      setNotifications(prev => {
        if (loadMore) {
          // Éviter les doublons
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = formattedNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNew];
        } else {
          return formattedNotifications;
        }
      });

      setHasMore(newNotifications.length > 0 && newNotifications.length >= 10);
      if (loadMore) setPage(currentPage);

    } catch (error) {
      console.error("Fetch notifications error:", error);
      Alert.alert("Erreur", "Impossible de charger les notifications");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setExpandedNotifications({});
    setHasMore(true);
    await fetchNotifications(false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!searchQuery && hasMore && !isLoadingMore) {
      fetchNotifications(true);
    }
  };

  const toggleExpand = (id) => {
    setExpandedNotifications(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLinkPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien');
    }
  };

  const renderItem = useCallback(({ item }) => {
    if (!item || !item.id) return null;

    const isExpanded = expandedNotifications[item.id] || false;
    const icon = getNotificationIcon(item.title);
    const color = getNotificationColor(item.title);
    const displayText = item.text || item.content || item.title || '';
    const shortText = displayText.length > 3 ? displayText.substring(0, 3) + '...' : displayText;
    const showExpand = displayText.length > 3;
    const isRead = item.etat === 1;
    const links = extractLinks(displayText);

    return (
      <Animated.View style={[
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
      ]}>
        <LinearGradient
          colors={isRead ? ['rgba(248,250,252,0.98)', 'rgba(248,250,252,1)'] : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,1)']}
          style={styles.cardGradient}
        />

        <View style={[styles.statusBar, { backgroundColor: color }]} />

        {!isRead && (
          <View style={[styles.unreadIndicator, { backgroundColor: color }]} />
        )}

        <View style={styles.cardHeader}>
          <View style={[styles.icon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>

          <View style={styles.headerText}>
            <Text style={[styles.title, isRead ? styles.readTitle : styles.unreadTitle]} numberOfLines={2}>
              {item.title || 'Notification sans titre'}
            </Text>
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={12} color="#64748B" />
              <Text style={styles.metaText}>{formatTime(item.date)}</Text>
              <View style={styles.separator} />
              <Ionicons name="calendar-outline" size={12} color="#64748B" />
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
              {item.type && (
                <>
                  <View style={styles.separator} />
                  <Ionicons name="pricetag-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.type}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.content, isRead && styles.readContent]}>
            {isExpanded ? displayText : shortText}
          </Text>

          {/* Affichage des liens si présents */}
          {links.length > 0 && (
            <View style={styles.linksContainer}>
              {links.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.linkButton}
                  onPress={() => handleLinkPress(link)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={14} color="#3B82F6" style={styles.linkIcon} />
                  <Text style={styles.linkText} numberOfLines={1}>
                    Lien {index + 1}
                  </Text>
                  <Ionicons name="open-outline" size={14} color="#3B82F6" style={styles.openIcon} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {(showExpand || item.text || item.content) && (
          <TouchableOpacity
            style={[styles.expandButton, {
              borderColor: `${color}30`,
              backgroundColor: `${color}05`
            }]}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.expandContent}>
              <Text style={[styles.expandText, { color }]}>
                {isExpanded ? 'Voir moins' : 'Voir les détails'}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={color}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }, [expandedNotifications, cardsAnim]);

  const renderGroup = useCallback(({ item: group }) => {
    if (!group || !group.notifications || group.notifications.length === 0) {
      return null;
    }

    return (
      <View style={styles.group} key={group.dateKey}>
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderContent}>
            <View style={styles.groupIconContainer}>
              <Ionicons name="calendar" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.groupTitle}>{group.dateLabel}</Text>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{group.notifications.length}</Text>
            </View>
          </View>
          <View style={styles.groupLine} />
        </View>
        {group.notifications.map((item, index) => (
          <View key={`${item.id || index}_${index}`} style={styles.itemContainer}>
            {renderItem({ item })}
          </View>
        ))}
      </View>
    );
  }, [renderItem]);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={searchQuery ? "search-outline" : "notifications-off-outline"}
          size={64}
          color="#CBD5E1"
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? "Aucun résultat trouvé" : "Aucune notification"}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? `Aucune notification ne correspond à "${searchQuery}"`
          : "Vous n'avez pas de nouvelles notifications pour le moment."}
      </Text>
      {searchQuery && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color="#FFFFFF"
            style={styles.clearSearchIcon}
          />
          <Text style={styles.clearSearchText}>Effacer la recherche</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const groupedData = groupNotificationsByDate(filteredNotifications);

  if (loading && !refreshing) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Header title="Notifications" withBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

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

      <Animated.View style={[
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
      ]}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des notifications..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.6}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <View style={styles.listContainer}>
        <FlatList
          data={groupedData}
          renderItem={renderGroup}
          keyExtractor={(group) => group.dateKey}
          contentContainerStyle={[
            styles.listContent,
            groupedData.length === 0 && styles.emptyListContent
          ]}
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
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.footerText}>Chargement...</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  group: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  groupHeader: {
    marginBottom: 16,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  groupBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  groupBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  groupLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 44,
  },
  itemContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  unreadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 22,
  },
  readTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    marginRight: 8,
    fontWeight: '500',
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  contentContainer: {
    marginBottom: 16,
  },
  content: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },
  readContent: {
    color: '#64748B',
  },
  linksContainer: {
    marginTop: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkIcon: {
    marginRight: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  openIcon: {
    marginLeft: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  expandContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  clearSearchIcon: {
    marginRight: 8,
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
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default NotificationScreen;
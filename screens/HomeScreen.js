import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

const getNotificationIcon = (title) => {
  if (!title) return 'notifications-outline';
  if (title.toLowerCase().includes('demande')) return 'document-text-outline';
  if (title.toLowerCase().includes('validation')) return 'checkmark-circle-outline';
  if (title.toLowerCase().includes('rejet')) return 'close-circle-outline';
  if (title.toLowerCase().includes('message')) return 'mail-outline';
  return 'notifications-outline';
};

const formatNotificationDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return "Aujourd'hui";
  if (isYesterday) return "Hier";
  
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');

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
      console.log('Erreur:', error.message);
      
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

  const fetchRecentNotifications = async () => {
    try {
      setNotificationLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`https://isbadmin.tn/api/getNotifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return;

      const responseData = await response.json();
      if (responseData.notifications && responseData.notifications.length > 0) {
        const sorted = responseData.notifications.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ).slice(0, 3);
        setRecentNotifications(sorted);
      }
    } catch (error) {
      console.log("Error fetching notifications:", error.message);
    } finally {
      setNotificationLoading(false);
    }
  };

  const loadUserProfile = async () => {
    setLoading(true);
    const profile = await fetchProfileFromAPI();
    if (profile) {
      setUserData(profile);
    }
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
      fetchRecentNotifications();
    }, [])
  );
  
  const features = [
    { 
      title: 'Mes Notes', 
      icon: 'school-outline', 
      screen: 'Semester',
      gradient: ['#1E3A8A', '#2563EB'],
      description: 'Consultez vos notes'
    },
    { 
      title: 'Documents', 
      icon: 'folder-outline', 
      screen: 'Documents',
      gradient: ['#F59E0B', '#FBBF24'],
      description: 'Gérez vos fichiers'
    },
    { 
      title: 'Emploi du temps', 
      icon: 'calendar-outline', 
      screen: 'Emploi',
      gradient: ['#1E3A8A', '#3B82F6'],
      description: 'Planning des cours'
    },
    { 
      title: 'Diplômes', 
      icon: 'ribbon-outline', 
      screen: 'Diplome',
      gradient: ['#F59E0B', '#F97316'],
      description: 'Vos certifications'
    },
    { 
      title: 'Paiements', 
      icon: 'card-outline', 
      screen: 'Payment',
      gradient: ['#1E3A8A', '#1D4ED8'],
      description: 'Historique des paiements'
    },
    { 
      title: 'Absences', 
      icon: 'person-remove-outline', 
      screen: 'Absences',
      gradient: ['#EF4444', '#DC2626'],
      description: 'Suivi des absences'
    },
  ];

  const pdfDocuments = [
    {
      title: 'Calendrier Universitaire 2024-2025',
      description: 'Planning académique complet de l\'année universitaire avec toutes les dates importantes',
      fileName: 'CALENDRIER_UNIVERSITAIRE_2024_2025.pdf',
      url: 'https://iitadmin.tn/assets/CALENDRIER_UNIVERSITAIRE_2024_2025.pdf',
      icon: 'calendar',
      color: ['#1E3A8A', '#1D4ED8'],
      category: 'Académique',
      isNew: true
    },
  ];

  const handleOpenPDF = async (url, title) => {
    try {
      const correctedUrl = url.replace(/\s/g, '_').replace(/%20/g, '_');
      
      Alert.alert(
        "Ouvrir le document",
        `Voulez-vous ouvrir "${title}" ?`,
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Navigateur",
            onPress: () => {
              Linking.openURL(correctedUrl).catch(() => {
                Alert.alert('Erreur', 'Impossible d\'ouvrir le document');
              });
            }
          },
          {
            text: "Vue intégrée",
            onPress: () => {
              setCurrentPdfUrl(correctedUrl);
              setShowWebView(true);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le document');
    }
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
    setCurrentPdfUrl('');
  };

  const handleFeaturePress = (screen) => {
    try {
      navigation.navigate(screen);
    } catch (error) {
      Alert.alert('Navigation', `Redirection vers ${screen}`);
    }
  };

  if (showWebView) {
    return (
      <View style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleCloseWebView}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Document PDF</Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => Linking.openURL(currentPdfUrl)}
          >
            <Ionicons name="open-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <WebView 
          source={{ uri: currentPdfUrl }}
          style={styles.webView}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.loadingText}>Chargement du document...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeAccent} />
        
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : userData ? (
              <>
                <Text style={styles.greetingText}>Bonjour,</Text>
                <Text style={styles.userNameText}>
                  {userData.prenom} {userData.nom}
                </Text>
                <Text style={styles.studentIdText}>
                  {userData.numero_etudiant || userData.email}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.greetingText}>Bonjour,</Text>
                <Text style={styles.userNameText}>Étudiant</Text>
                <Text style={styles.studentIdText}>Connexion requise</Text>
              </>
            )}
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleFeaturePress('Messagerie')}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleFeaturePress('notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => handleFeaturePress('Profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.mainSection}>
          <Text style={styles.sectionTitle}>Services Étudiants</Text>
          <Text style={styles.sectionSubtitle}>
            Accédez rapidement à tous vos services académiques
          </Text>
          
          <View style={styles.grid}>
            {features.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.featureCard}
                onPress={() => handleFeaturePress(item.screen)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                      <Ionicons 
                        name={item.icon} 
                        size={28} 
                        color="white" 
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.featureTitle}>{item.title}</Text>
                      <Text style={styles.featureDescription}>{item.description}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.pdfSection}>
          <View style={styles.pdfSectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Calendrier Académique</Text>
              <Text style={styles.sectionSubtitle}>
                Documents officiels et plannings
              </Text>
            </View>
          </View>
          
          {pdfDocuments.map((doc, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.pdfCard, doc.isNew && styles.newDocument]}
              onPress={() => handleOpenPDF(doc.url, doc.title)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={doc.color}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pdfCardGradient}
              >
                <View style={styles.pdfCardContent}>
                  <View style={styles.pdfIconContainer}>
                    <Ionicons name={doc.icon} size={32} color="white" />
                  </View>
                  
                  <View style={styles.pdfTextContent}>
                    <View style={styles.pdfTitleRow}>
                      <Text style={styles.pdfTitle} numberOfLines={2}>{doc.title}</Text>
                      {doc.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NOUVEAU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pdfDescription} numberOfLines={2}>{doc.description}</Text>
                    <View style={styles.pdfMetadata}>
                      <View style={styles.pdfCategory}>
                        <Text style={styles.pdfCategoryText}>{doc.category}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.pdfActionContainer}>
                    <View style={styles.downloadButton}>
                      <Ionicons name="eye-outline" size={22} color="white" />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.newsSection}>
        <Text style={styles.sectionTitle}>Actualités</Text>
        <Text style={styles.sectionSubtitle}>
          Les dernières informations de votre établissement
        </Text>

        {notificationLoading ? (
          <View style={styles.newsCard}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1E3A8A" />
              <Text style={styles.newsDescription}>Chargement des notifications...</Text>
            </View>
          </View>
        ) : recentNotifications.length > 0 ? (
          <>
            {recentNotifications
              .slice(0, 2) // <= Limite à 2 notifications
              .map((notification, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.newsCard,
                    index !== 1 && styles.notificationSeparator // Séparateur sauf après le 2e
                  ]}
                  onPress={() => handleFeaturePress('notifications')}
                  activeOpacity={0.7}
                >
                  <View style={styles.newsHeader}>
                    <View style={styles.newsIconContainer}>
                      <Image
                        source={require('../assets/isb.png')}
                        style={styles.notificationLogo}
                      />
                    </View>
                    <Text style={styles.newsTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <View style={styles.newsDateBadge}>
                      <Text style={styles.newsDateBadgeText}>
                        {formatNotificationDate(notification.date)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.newsDescription} numberOfLines={3}>
                    {stripHtmlTags(notification.text)}
                  </Text>
                  <View style={styles.newsFooter}>
                    <TouchableOpacity
                      style={styles.readMoreButton}
                      onPress={() => handleFeaturePress('notifications')}
                    >
                      <Text style={styles.readMoreText}>Lire la suite</Text>
                      <Ionicons name="chevron-forward" size={14} color="#1E3A8A" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
          </>
        ) : (
          <View style={styles.newsCard}>
            <View style={styles.newsHeader}>
              <View style={styles.newsIconContainer}>
                <Image
                  source={require('../assets/isb.png')}
                  style={styles.notificationLogo}
                />
              </View>
              <Text style={styles.newsTitle}>Aucune notification</Text>
            </View>
            <Text style={styles.newsDescription}>
              Vous n'avez pas de nouvelles notifications pour le moment. Revenez plus tard pour voir les dernières actualités.
            </Text>
          </View>
        )}
      </View>


        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  webViewHeader: {
    height: Platform.OS === 'ios' ? 100 : 80,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A',
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: 'white',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  headerContainer: {
    height: Platform.OS === 'ios' ? 140 : 120,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: -20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  decorativeAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FBBF24',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    zIndex: 1,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  studentIdText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  mainSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  featureCard: {
    width: (width - 55) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    marginBottom: 15,
  },
  cardGradient: {
    flex: 1,
  },
  cardContent: {
    padding: 18,
    height: 120,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  pdfSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pdfSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pdfCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  newDocument: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  pdfCardGradient: {
    flex: 1,
  },
  pdfCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
  },
  pdfIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pdfTextContent: {
    flex: 1,
  },
  pdfTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 10,
  },
  newBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  pdfDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 18,
  },
  pdfMetadata: {
    gap: 8,
  },
  pdfCategory: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  pdfCategoryText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  pdfActionContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
    marginBottom: 12,
  },
  notificationSeparator: {
    marginBottom: 12,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    letterSpacing: 0.2,
    marginRight: 8,
  },
  newsDateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  newsDateBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  newsDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 15,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  readMoreText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  viewAllNotificationsButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  bottomSpacing: {
    height: 30,
  },
});
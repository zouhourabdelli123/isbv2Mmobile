import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import DynamicHeader from './header';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width, height } = Dimensions.get('window');

export default function ScheduleScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Token error handler
  const handleTokenError = useCallback(async () => {
    console.log('Token invalide ou expiré, déconnexion...');
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      navigation.navigate('Login');
    } catch (error) {
      console.log('Error clearing storage:', error);
    }
  }, [navigation]);

  // Fetch schedule from API
  const fetchSchedule = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token non trouvé');
      }

      const response = await fetch(`https://isbadmin.tn/api/getCalendar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        await handleTokenError();
        return;
      }

      const result = await response.json();

 if (response.ok && result.pdfUrl) {
  // Corriger l'URL relative en absolue
  const absoluteUrl = result.pdfUrl.startsWith('http')
    ? result.pdfUrl
    : `${BASE_URL_APP.replace(/\/$/, '')}/${result.pdfUrl.replace(/^\//, '')}`;
  
  setPdfUrl(absoluteUrl);
  setError(null);
} else {
  throw new Error(result.message || 'Erreur lors de la récupération du calendrier');
}

    } catch (err) {
      console.log('Fetch schedule error:', err);
      setError(err.message);
      Alert.alert('Erreur', err.message);
    }
  }, [handleTokenError]);

  // Fetch user info and schedule
  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
      
      await fetchSchedule();
      
      // Animate slide in
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.log('[fetchUserInfo] Erreur:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSchedule, slideAnim]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserInfo().finally(() => setRefreshing(false));
  }, [fetchUserInfo]);

  // Open PDF in full screen modal
  const openPdfFullScreen = useCallback(() => {
    if (pdfUrl) {
      setPdfModalVisible(true);
    } else {
      Alert.alert('Erreur', 'Aucun PDF disponible');
    }
  }, [pdfUrl]);

  // Open PDF in external browser
  const openInBrowser = useCallback(() => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl).catch(err => {
        console.log('Error opening URL:', err);
        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien dans le navigateur');
      });
    }
  }, [pdfUrl]);

  // Close modal handler
  const closePdfModal = useCallback(() => {
    setPdfModalVisible(false);
  }, []);

  // WebView error handler
  const handleWebViewError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.log('WebView error:', nativeEvent);
    Alert.alert(
      'Erreur de chargement', 
      'Impossible de charger le PDF. Voulez-vous l\'ouvrir dans votre navigateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir dans le navigateur', onPress: openInBrowser }
      ]
    );
  }, [openInBrowser]);

  if (loading) {
    return <Loading />;
  }


  // Error state
  if (error && !pdfUrl) {
    return (
      <View style={styles.container}>
        <Header title="Emploi du Temps" withBackButton />
        <DynamicHeader 
          title="Mon Emploi du Temps"
          subtitle="Erreur de chargement"
          iconName="calendar-today"
          userInfo={userInfo}
          slideAnim={slideAnim}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Oops! Une erreur est survenue</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserInfo}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <Header title="Emploi du Temps" withBackButton />
      


      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={openPdfFullScreen}>
          <MaterialIcons name="fullscreen" size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Plein écran</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh} disabled={refreshing}>
          <MaterialIcons name="refresh" size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Actualiser</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={openInBrowser}>
          <MaterialIcons name="open-in-browser" size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Navigateur</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {pdfUrl ? (
          <WebView
            source={{ 
              uri: Platform.OS === 'ios' 
                ? pdfUrl 
                : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
            }}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.webviewLoadingText}>Chargement du PDF...</Text>
              </View>
            )}
            onError={handleWebViewError}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView HTTP error:', nativeEvent);
            }}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        ) : (
          <View style={styles.noPdfContainer}>
            <MaterialIcons name="description" size={64} color="#9CA3AF" />
            <Text style={styles.noPdfTitle}>Aucun emploi du temps disponible</Text>
            <Text style={styles.noPdfMessage}>Votre planning n'est pas encore disponible.</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Full Screen PDF Modal */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        onRequestClose={closePdfModal}
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closePdfModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
              <Text style={styles.modalCloseText}>Retour</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Emploi du Temps</Text>
            
            <TouchableOpacity 
              style={styles.modalActionButton}
              onPress={openInBrowser}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="open-in-browser" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          
          {pdfUrl && (
            <WebView
              source={{ uri: pdfUrl }}
              style={styles.modalWebview}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={styles.modalLoadingText}>Chargement...</Text>
                </View>
              )}
              onError={handleWebViewError}
              mixedContentMode="compatibility"
              allowsInlineMediaPlayback={true}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webviewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  webviewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  noPdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noPdfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noPdfMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  modalCloseText: {
    marginLeft: 4,
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalActionButton: {
    padding: 4,
  },
  modalWebview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
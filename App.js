import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AppNavigator from './AppNavigator';

export default function App() {
  const [fcmToken, setFcmToken] = useState('');

  useEffect(() => {
    initializeFCM();

    setupNotificationHandlers();
    
    return () => {
    };
  }, []);

  const initializeFCM = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        
        // Get FCM token
        const token = await messaging().getToken();
        if (token) {
          setFcmToken(token);
          console.log("FCM Token:", token);

          // ✅ Subscribe to the 'all_users' topic
          messaging()
            .subscribeToTopic('all_users')
            .then(() => {
              console.log('✅ Subscribed to topic: all_users');
            })
            .catch(err => {
              console.log('❌ Failed to subscribe to topic: all_users', err);
            });
        }
      } else {
        console.log('Permission refusée pour les notifications');
      }
    } catch (error) {
      console.log('Erreur lors de l\'initialisation FCM:', error);
    }
  };

  const setupNotificationHandlers = () => {
    // Handle notifications when app is in foreground
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Notification reçue en premier plan:', remoteMessage);
      
      const title = remoteMessage.notification?.title || 'Notification';
      const body = remoteMessage.notification?.body?.replace(/<[^>]*>/g, '') || 'Nouvelle notification';
      
      Alert.alert(title, body);
    });

    // Handle notification when app is opened from background/quit state
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification tapée (app en arrière-plan):', remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification tapée (app fermée):', remoteMessage);
        }
      });

    // Handle token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
      console.log('FCM Token rafraîchi:', token);
      setFcmToken(token);
    });

    // Return cleanup function
    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  };

  return <AppNavigator />;
}

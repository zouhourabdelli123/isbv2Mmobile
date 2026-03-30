import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, Alert, LogBox } from 'react-native';
import AppNavigator from './AppNavigator';

LogBox.ignoreAllLogs(true);

if (__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log("Expo Push Token:", token);
      }
    });

    // Configuration des notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Écouteurs de notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
      const title = notification.request.content.title || 'Notification';
      const body = notification.request.content.body?.replace(/<[^>]*>/g, '') || 'Nouvelle notification';
      
      Alert.alert(title, body);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapée:', response);
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return <AppNavigator />;
}

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Les notifications push doivent être testées sur un vrai appareil');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission refusée pour les notifications');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log('Erreur lors de la récupération du token Expo:', error);
    return null;
  }
}

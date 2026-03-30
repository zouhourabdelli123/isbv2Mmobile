import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL_APP } from '../api';

const USER_TOKEN_KEY = 'userToken';
const AUTH_LOG_PREFIX = '[AUTH]';

const authLog = (...args) => {
  console.log(AUTH_LOG_PREFIX, ...args);
};

export const getStoredToken = async () => {
  const token = await AsyncStorage.getItem(USER_TOKEN_KEY);
  authLog(token ? 'Token local trouve' : 'Aucun token local');
  return token;
};

export const setStoredToken = async (token) => {
  if (!token) return;
  await AsyncStorage.setItem(USER_TOKEN_KEY, token);
  authLog('Token sauvegarde');
};

export const clearStoredSession = async () => {
  await AsyncStorage.multiRemove([
    'userToken',
    'userData',
    'firebaseID',
    'firebaseRegistered',
  ]);
  authLog('Session locale supprimee');
};

export const refreshStoredToken = async () => {
  const currentToken = await getStoredToken();

  if (!currentToken) {
    authLog('Refresh ignore: pas de token');
    return null;
  }

  try {
    authLog('Tentative refresh token');
    const response = await fetch(`${BASE_URL_APP}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) {
      authLog(`Refresh refuse: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data?.token) {
      authLog('Refresh invalide: token absent dans la reponse');
      return null;
    }

    await setStoredToken(data.token);
    authLog('Refresh reussi');
    return data.token;
  } catch (error) {
    authLog('Erreur refreshStoredToken:', error.message);
    return null;
  }
};

export const getUsableToken = async () => {
  const token = await getStoredToken();

  if (!token) {
    authLog('Aucun token utilisable');
    return null;
  }

  const refreshedToken = await refreshStoredToken();
  authLog(refreshedToken ? 'Token rafraichi utilise' : 'Token local existant reutilise');
  return refreshedToken || token;
};

export const fetchWithAutoRefresh = async (url, options = {}) => {
  const token = await getStoredToken();

  if (!token) {
    authLog(`Requete sans token: ${url}`);
    return { response: null, token: null };
  }

  authLog(`Requete API avec token local: ${url}`);

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status !== 401) {
    authLog(`Requete OK sans refresh: HTTP ${response.status}`);
    return { response, token };
  }

  authLog(`HTTP 401 detecte, tentative refresh: ${url}`);
  const refreshedToken = await refreshStoredToken();

  if (!refreshedToken) {
    authLog('Refresh impossible apres 401');
    return { response, token: null };
  }

  response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${refreshedToken}`,
    },
  });

  authLog(`Requete rejouee apres refresh: HTTP ${response.status}`);
  return { response, token: refreshedToken };
};

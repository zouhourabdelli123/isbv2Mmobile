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

export const clearStoredToken = async () => {
  await AsyncStorage.removeItem(USER_TOKEN_KEY);
  authLog('Token local supprime');
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
    return { error: 'NO_TOKEN' };
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

    if (response.status === 401 || response.status === 403) {
      authLog(`Refresh refuse: HTTP ${response.status} (Authentication Error, token local conserve)`);
      return { error: 'AUTH_ERROR' };
    }

    if (!response.ok) {
      authLog(`Refresh refuse: HTTP ${response.status} (Server Error)`);
      return { error: 'SERVER_ERROR' };
    }

    const data = await response.json();

    if (!data?.token) {
      authLog('Refresh invalide: token absent dans la reponse');
      return { error: 'SERVER_ERROR' };
    }

    await setStoredToken(data.token);
    authLog('Refresh reussi');
    return { token: data.token };
  } catch (error) {
    authLog('Erreur refreshStoredToken (Network Error):', error.message);
    return { error: 'NETWORK_ERROR' };
  }
};

export const getUsableToken = async () => {
  const token = await getStoredToken();

  if (!token) {
    authLog('Aucun token utilisable');
    return null;
  }

  const result = await refreshStoredToken();
  const refreshedToken = result?.token;

  if (result?.error === 'AUTH_ERROR') {
    authLog('Refresh refuse, token local reutilise');
    return token;
  }

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
  const result = await refreshStoredToken();
  const refreshedToken = result?.token;

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

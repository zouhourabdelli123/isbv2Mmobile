import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_APP = 'https://isbadmin.tn/api';

const api = axios.create({
  baseURL: BASE_URL_APP,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export {
  api,
  BASE_URL_APP
};
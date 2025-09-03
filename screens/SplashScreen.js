import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      checkLoggedIn();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkLoggedIn = async () => {
    const userToken = await AsyncStorage.getItem('userToken');
    navigation.replace(userToken ? 'Home' : 'Login');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/isbfont.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#000080" style={styles.spinner} />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  logo: {
    width: width * 0.8, 
    height: width * 0.8, 
  },
  spinner: {
    marginTop: 20,
  },
});

export default SplashScreen;

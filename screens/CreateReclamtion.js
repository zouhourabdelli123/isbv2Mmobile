import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DynamicHeader from './header';
import Header from '../components/Header';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');
const BASE_URL_APP = 'https://isbadmin.tn/api'; // Remplacez par votre URL d'API

export default function CreerReclamationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  
  // Form states
  const [titre, setTitre] = useState('');
  const [contenue, setContenue] = useState('');
  const [errors, setErrors] = useState({});

  const fetchUserInfo = async () => {
    console.log('[fetchUserInfo] Début de la récupération des informations utilisateur...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();

    } catch (error) {
      console.log('[fetchUserInfo] Erreur:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUserInfo();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserInfo();
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!titre.trim()) {
      newErrors.titre = 'Le titre est obligatoire';
    }
    
    if (!contenue.trim()) {
      newErrors.contenue = 'Le contenu est obligatoire';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log("Token is null");
        throw new Error("Token is null");
      }
      
      const response = await fetch(`${BASE_URL_APP}/addReclamation`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titre,
          contenue,
        }),
      });
      
      if (!response.ok) {
        const errorResult = await response.json();
        console.log("Erreur dans la réponse:", errorResult);
        throw new Error(errorResult.message || 'Une erreur est survenue');
      }
      
      const result = await response.json();
      console.log("Résultat JSON:", result);
      
      Alert.alert(
        'Succès',
        'Réclamation ajoutée avec succès !',
        [
          { text: 'OK', onPress: () => navigation.navigate('Reclamation') }
        ],
        { cancelable: false }
      );
      
      // Reset form
      setTitre('');
      setContenue('');
      setErrors({});
      
    } catch (error) {
      console.log("Erreur attrapée:", error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Nouvelle Réclamation" withBackButton />
      
      <DynamicHeader 
        title="Créer une Réclamation"
        subtitle="Signaler un problème ou une anomalie"
        iconName="file-document-edit"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A', '#F59E0B']}
            tintColor="#1E3A8A"
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: cardsAnim,
              transform: [{
                translateY: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0]
                })
              }]
            }
          ]}
        >
          {/* Form Card */}
          <View style={styles.formCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerIconContainer}>
                  <MaterialIcons name="report-problem" size={28} color="#F59E0B" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.cardTitle}>Détails de la réclamation</Text>
                  <Text style={styles.cardSubtitle}>
                    Décrivez votre problème de manière détaillée
                  </Text>
                </View>
              </View>

              <View style={styles.formFields}>
                {/* Titre Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    Titre de la réclamation *
                  </Text>
                  <View style={[styles.inputContainer, errors.titre && styles.inputError]}>
                    <MaterialIcons name="title" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: Problème avec relevé de notes"
                      value={titre}
                      onChangeText={(text) => {
                        setTitre(text);
                        if (errors.titre) {
                          setErrors(prev => ({ ...prev, titre: null }));
                        }
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  {errors.titre && (
                    <Text style={styles.errorText}>{errors.titre}</Text>
                  )}
                </View>

                {/* Contenu Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    Description du problème *
                  </Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer, errors.contenue && styles.inputError]}>
                    <MaterialIcons name="description" size={20} color="#6B7280" style={[styles.inputIcon, styles.textAreaIcon]} />
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Décrivez en détail le problème rencontré..."
                      value={contenue}
                      onChangeText={(text) => {
                        setContenue(text);
                        if (errors.contenue) {
                          setErrors(prev => ({ ...prev, contenue: null }));
                        }
                      }}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  {errors.contenue && (
                    <Text style={styles.errorText}>{errors.contenue}</Text>
                  )}
                </View>

              
              </View>
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isSubmitting ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#FBBF24']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <MaterialIcons name="send" size={24} color="white" />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer la réclamation'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  content: { 
    paddingHorizontal: 20, 
    paddingBottom: 40, 
    paddingTop: 20 
  },
  formContainer: {
    flex: 1,
  },
  formCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  formFields: {
    gap: 20,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    padding: 0,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 12,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import DynamicHeader from '../screens/header';
import axios from 'axios';
import { BASE_URL_APP } from '../api.js';

const documentTypes = [
  { 
    id: 'AS', 
    name: 'Attestation de scolarité', 
    icon: 'school',
    description: 'Certificat de votre inscription actuelle'
  },
  { 
    id: 'RN', 
    name: 'Relevé de notes', 
    icon: 'grade',
    description: 'Bulletin officiel de vos résultats'
  },
  { 
    id: 'CR', 
    name: 'Certificat de réussite', 
    icon: 'emoji-events',
    description: 'Attestation de validation d\'année'
  },
  { 
    id: 'DS', 
    name: 'Demande de stage', 
    icon: 'business',
    description: 'Convention de stage professionnel'
  },
  { 
    id: 'PAI', 
    name: 'Projet académique individuel', 
    icon: 'assignment',
    description: 'Dossier de projet personnel'
  }
];

// Fonction utilitaire pour formater la date
const formatDate = (date) => {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('fr-FR', options);
};

export default function CreateRequestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [justification, setJustification] = useState('');
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentDate] = useState(new Date());
  const [focusedInput, setFocusedInput] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
        
        // Animation d'entrée
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
        console.log('Erreur lors de la récupération des données utilisateur:', error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de document');
      return;
    }

    if (isUrgent && !justification.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une justification pour la demande urgente');
      return;
    }

    // Validation spécifique pour les justifications d'urgence
    if (isUrgent && justification.trim().length < 10) {
      Alert.alert('Erreur', 'La justification doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Préparer les données selon le type de document
      const requestData = {
        type: selectedType,
        urgent: isUrgent ? "true" : "false", // L'API attend une string
        justification: isUrgent ? justification.trim() : "",
      };

      // Pour les documents autres que DS, ajouter l'année
      if (selectedType !== 'DS') {
        requestData.year = new Date().getFullYear();
      }

      console.log('Données envoyées à l\'API:', requestData);

      const response = await axios.post(
        `${BASE_URL_APP}/createDocument`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Réponse de l\'API:', response.data);

      Alert.alert('Succès', 'Votre demande a été créée avec succès', [
        { 
          text: 'OK', 
          onPress: () => {
            navigation.goBack();
          }
        },
      ]);

    } catch (error) {
      console.log('Erreur lors de la création de la demande:', error);
      
      let errorMessage = 'Une erreur est survenue lors de la création de la demande';
      
      if (error.response) {
        // Erreur de réponse du serveur
        console.log('Erreur de réponse:', error.response.data);
        console.log('Status:', error.response.status);
        
        if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // Erreur de réseau
        console.log('Erreur de réseau:', error.request);
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedDocument = () => {
    return documentTypes.find(doc => doc.id === selectedType);
  };

  const selectDocument = (doc) => {
    setSelectedType(doc.id);
    setShowDropdown(false);
  };

  const handleUrgentToggle = (value) => {
    setIsUrgent(value);
    if (!value) {
      setJustification(''); 
    }
  };

  const isFormValid = () => {
    if (!selectedType) return false;
    if (isUrgent && (!justification.trim() || justification.trim().length < 10)) return false;
    return true;
  };

  return (
    <View style={styles.container}>
      <Header title="Nouvelle demande" withBackButton />
      
      <DynamicHeader 
        title="Créer une demande"
        subtitle="Demande de document administratif"
        iconName="file-plus"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <ScrollView contentContainerStyle={styles.content}>
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
          {/* Section Date de demande */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date de demande</Text>
            <View style={styles.dateDisplayContainer}>
              <View style={styles.dateIconContainer}>
                <MaterialIcons name="event" size={20} color="#1E3A8A" />
              </View>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
                <Text style={styles.dateSubtext}>Demande créée maintenant</Text>
              </View>
            </View>
          </View>

          {/* Section type de document */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type de document *</Text>
            
            <TouchableOpacity
              style={[
                styles.dropdown,
                selectedType && styles.dropdownSelected
              ]}
              onPress={() => setShowDropdown(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownContent}>
                {selectedType ? (
                  <View style={styles.selectedDocumentContainer}>
                    <View style={styles.selectedDocumentIcon}>
                      <MaterialIcons 
                        name={getSelectedDocument()?.icon} 
                        size={20} 
                        color="#1E3A8A" 
                      />
                    </View>
                    <View style={styles.selectedDocumentText}>
                      <Text style={styles.selectedDocumentName}>
                        {getSelectedDocument()?.name}
                      </Text>
                      <Text style={styles.selectedDocumentDescription}>
                        {getSelectedDocument()?.description}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>
                    Sélectionnez un type de document
                  </Text>
                )}
                <MaterialIcons 
                  name={showDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#6B7280" 
                />
              </View>
            </TouchableOpacity>

            {/* Modal de la liste déroulante */}
            <Modal
              visible={showDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDropdown(false)}
              >
                <View style={styles.dropdownModal}>
                  <Text style={styles.modalTitle}>Choisir un type de document</Text>
                  
                  {documentTypes.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.dropdownItem,
                        selectedType === doc.id && styles.dropdownItemSelected
                      ]}
                      onPress={() => selectDocument(doc)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownItemIcon}>
                        <MaterialIcons 
                          name={doc.icon} 
                          size={22} 
                          color={selectedType === doc.id ? "#1E3A8A" : "#6B7280"} 
                        />
                      </View>
                      <View style={styles.dropdownItemText}>
                        <Text style={[
                          styles.dropdownItemName,
                          selectedType === doc.id && styles.dropdownItemNameSelected
                        ]}>
                          {doc.name}
                        </Text>
                        <Text style={[
                          styles.dropdownItemDescription,
                          selectedType === doc.id && styles.dropdownItemDescriptionSelected
                        ]}>
                          {doc.description}
                        </Text>
                      </View>
                      {selectedType === doc.id && (
                        <MaterialIcons name="check" size={20} color="#1E3A8A" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Section urgence */}
          <View style={styles.section}>
            <View style={styles.urgentContainer}>
              <View style={styles.urgentInfo}>
                <MaterialIcons name="priority-high" size={24} color="#DC2626" />
                <View style={styles.urgentTextContainer}>
                  <Text style={styles.urgentTitle}>Demande urgente</Text>
                  <Text style={styles.urgentSubtitle}>
                    Traitement prioritaire (24-48h)
                  </Text>
                </View>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={handleUrgentToggle}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={isUrgent ? '#FFFFFF' : '#F9FAFB'}
              />
            </View>
          </View>

          {/* Section justification (si urgent) */}
          {isUrgent && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Justification *</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'justification' && styles.inputContainerFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <MaterialIcons 
                    name="edit" 
                    size={20} 
                    color={focusedInput === 'justification' ? '#1E3A8A' : '#9CA3AF'} 
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Expliquez la raison de votre demande urgente..."
                  placeholderTextColor="#9CA3AF"
                  value={justification}
                  onChangeText={setJustification}
                  onFocus={() => setFocusedInput('justification')}
                  onBlur={() => setFocusedInput('')}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.inputHint}>
                Minimum 10 caractères requis pour justifier l'urgence ({justification.length}/10)
              </Text>
            </View>
          )}

          {/* Bouton de soumission */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid() && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                !isFormValid() || submitting 
                  ? ['#9CA3AF', '#6B7280'] 
                  : ['#1E3A8A', '#3B82F6', '#60A5FA']
              }
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Soumettre la demande</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Section informative */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="info-outline" size={20} color="#059669" />
              <Text style={styles.infoTitle}>À savoir</Text>
            </View>
            <Text style={styles.infoText}>
              • Délai normal : 3-5 jours ouvrables{'\n'}
              • Demande urgente : 24-48 heures{'\n'}
              • Notification par email à chaque étape{'\n'}
              • Documents téléchargeables une fois prêts
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
    marginTop: -12,
  },

  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Date display styles
  dateDisplayContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    backgroundColor: '#F0F9FF',
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    textTransform: 'capitalize',
  },
  dateSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  // Dropdown styles
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    transition: 'all 0.2s ease',
  },
  dropdownSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#FEFEFF',
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedDocumentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedDocumentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedDocumentText: {
    flex: 1,
  },
  selectedDocumentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedDocumentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dropdownItemNameSelected: {
    color: '#1E3A8A',
  },
  dropdownItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dropdownItemDescriptionSelected: {
    color: '#1E40AF',
  },

  // Urgent section styles
  urgentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  urgentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urgentTextContainer: {
    marginLeft: 12,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  urgentSubtitle: {
    fontSize: 14,
    color: '#7F1D1D',
    marginTop: 2,
  },

  // Improved Input styles
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  inputContainerFocused: {
    borderColor: '#1E3A8A',
    backgroundColor: '#FEFEFF',
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.15,
    elevation: 4,
  },
  inputIconContainer: {
    padding: 16,
    paddingTop: 18,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    fontWeight: '400',
    lineHeight: 22,
  },
  inputHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 4,
    fontStyle: 'italic',
  },

  // Submit button styles
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.05,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
});
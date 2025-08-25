import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';
import DynamicHeader from '../screens/header';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width, height } = Dimensions.get('window');

const StudentActivitiesScreen = () => {
  // États pour les données
  const [certifications, setCertifications] = useState([]);
  const [mobilityPeriods, setMobilityPeriods] = useState([]);
  const [internships, setInternships] = useState([]);
  const [voluntaryWork, setVoluntaryWork] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [awards, setAwards] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [otherInfo, setOtherInfo] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const navigation = useNavigation();

  // États pour les date pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [tempDate, setTempDate] = useState(new Date());

  // Animations
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // États pour le chargement et refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // États pour les modaux
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState('');
  const [formData, setFormData] = useState({});

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({
        ...formData,
        [currentDateField]: formattedDate
      });
    }
  };

  const DateInput = ({ placeholder, value, fieldName }) => {
    return (
      <TouchableOpacity 
        style={styles.dateInputContainer}
        onPress={() => {
          setCurrentDateField(fieldName);
          setTempDate(value ? new Date(value) : new Date());
          setShowDatePicker(true);
        }}
      >
        <Text style={[styles.dateInputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <View style={styles.calendarIconContainer}>
          <Ionicons name="calendar" size={20} color="#4A90E2" />
        </View>
      </TouchableOpacity>
    );
  };

  const isValidDate = (dateString) => {
    if (!dateString) return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const [year, month, day] = dateString.split('-').map(Number);
    
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  };

  const isValidDateRange = (startDate, endDate) => {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
    return new Date(startDate) <= new Date(endDate);
  };

  const getHeaders = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No token found');
        return {
          'Content-Type': 'application/json',
        };
      }
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.log('Error getting token:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  };

  const fetchCertifications = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getCertifications`, { headers });
      setCertifications(response.data.certifications || []);
    } catch (error) {
      console.log('Erreur certifications:', error.response?.data || error.message);
      setCertifications([]);
    }
  };

  const fetchMobilityPeriod = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getMobilityPeriod`, { headers });
      setMobilityPeriods(response.data.mobility || []);
    } catch (error) {
      console.log('Erreur mobilité:', error.response?.data || error.message);
      setMobilityPeriods([]);
    }
  };

  const fetchInternational_Internship = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getInternational_Internship`, { headers });
      setInternships(response.data.internship || []);
    } catch (error) {
      console.log('Erreur stages:', error.response?.data || error.message);
      setInternships([]);
    }
  };

  const fetchVoluntaryWork = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getVoluntaryWork`, { headers });
      setVoluntaryWork(response.data.voluntary || []);
    } catch (error) {
      console.log('Erreur travail volontaire:', error.response?.data || error.message);
      setVoluntaryWork([]);
    }
  };

  const fetchParticipation_In_Clubs = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getParticipation_In_Clubs`, { headers });
      setClubs(response.data.participation || []);
    } catch (error) {
      console.log('Erreur clubs:', error.response?.data || error.message);
      setClubs([]);
    }
  };

  const fetchAwards = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getAwards`, { headers });
      setAwards(response.data.awards || []);
    } catch (error) {
      console.log('Erreur prix:', error.response?.data || error.message);
      setAwards([]);
    }
  };

  const fetchOrganisation_Of_Conferences = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getOrganisation_Of_Conferences`, { headers });
      setConferences(response.data.organisation || []);
    } catch (error) {
      console.log('Erreur conférences:', error.response?.data || error.message);
      setConferences([]);
    }
  };

  const fetchOther_Information = async () => {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`https://isbadmin.tn/api/getOther_Information`, { headers });
      setOtherInfo(response.data.otherinformation || []);
    } catch (error) {
      console.log('Erreur autres infos:', error.response?.data || error.message);
      setOtherInfo([]);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      // Animation d'entrée plus fluide
      Animated.sequence([
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.stagger(100, [
          Animated.timing(cardsAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ])
      ]).start();

    } catch (error) {
      console.log('Error fetching user info:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchUserInfo(),
      fetchCertifications(),
      fetchMobilityPeriod(),
      fetchInternational_Internship(),
      fetchVoluntaryWork(),
      fetchParticipation_In_Clubs(),
      fetchAwards(),
      fetchOrganisation_Of_Conferences(),
      fetchOther_Information()
    ]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserInfo(),
          fetchCertifications(),
          fetchMobilityPeriod(),
          fetchInternational_Internship(),
          fetchVoluntaryWork(),
          fetchParticipation_In_Clubs(),
          fetchAwards(),
          fetchOrganisation_Of_Conferences(),
          fetchOther_Information(),
        ]);
      } catch (error) {
        console.log('Error loading data:', error);
        Alert.alert('Erreur', 'Problème lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  const validateFormData = (section, data) => {
    switch (section) {
      case 'certifications':
        if (!data.name?.trim()) return 'Le nom du certificat est requis';
        if (!data.date?.trim()) return 'La date est requise';
        if (!isValidDate(data.date)) return 'Format de date invalide. Utilisez YYYY-MM-DD (ex: 2024-01-15)';
        break;
        
      case 'mobility':
      case 'internship':
      case 'voluntary':
        if (!data.name?.trim()) return 'Le nom est requis';
        if (!data.dateStart?.trim() || !data.dateEnd?.trim()) return 'Les dates de début et fin sont requises';
        if (!isValidDate(data.dateStart)) return 'Format de date de début invalide. Utilisez YYYY-MM-DD';
        if (!isValidDate(data.dateEnd)) return 'Format de date de fin invalide. Utilisez YYYY-MM-DD';
        if (!isValidDateRange(data.dateStart, data.dateEnd)) return 'La date de fin doit être postérieure à la date de début';
        break;
        
      case 'clubs':
      case 'other':
        if (!data.description?.trim()) return 'La description est requise';
        if (!data.dateStart?.trim() || !data.dateEnd?.trim()) return 'Les dates de début et fin sont requises';
        if (!isValidDate(data.dateStart)) return 'Format de date de début invalide. Utilisez YYYY-MM-DD';
        if (!isValidDate(data.dateEnd)) return 'Format de date de fin invalide. Utilisez YYYY-MM-DD';
        if (!isValidDateRange(data.dateStart, data.dateEnd)) return 'La date de fin doit être postérieure à la date de début';
        break;
        
      case 'awards':
        if (!data.name?.trim()) return 'Le nom du prix est requis';
        if (!data.date?.trim()) return 'La date est requise';
        if (!isValidDate(data.date)) return 'Format de date invalide. Utilisez YYYY-MM-DD';
        break;
        
      case 'conferences':
        if (!data.description?.trim()) return 'La description est requise';
        if (!data.date?.trim()) return 'La date est requise';
        if (!isValidDate(data.date)) return 'Format de date invalide. Utilisez YYYY-MM-DD';
        break;
    }
    return null;
  };

  const createItem = async (section, data) => {
    try {
      const validationError = validateFormData(section, data);
      if (validationError) {
        Alert.alert('Erreur de validation', validationError);
        return;
      }

      const headers = await getHeaders();
      let response;

      switch (section) {
        case 'certifications':
          response = await axios.post(`https://isbadmin.tn/api/createCertifications`, data, { headers });
          await fetchCertifications();
          break;
        case 'mobility':
          response = await axios.post(`https://isbadmin.tn/api/createMobilityPeriod`, data, { headers });
          await fetchMobilityPeriod();
          break;
        case 'internship':
          response = await axios.post(`https://isbadmin.tn/api/createInternational_Internship`, data, { headers });
          await fetchInternational_Internship();
          break;
        case 'voluntary':
          response = await axios.post(`https://isbadmin.tn/api/createVoluntaryWork`, data, { headers });
          await fetchVoluntaryWork();
          break;
        case 'clubs':
          response = await axios.post(`https://isbadmin.tn/api/createParticipation_In_Clubs`, data, { headers });
          await fetchParticipation_In_Clubs();
          break;
        case 'awards':
          response = await axios.post(`https://isbadmin.tn/api/createAwards`, data, { headers });
          await fetchAwards();
          break;
        case 'conferences':
          response = await axios.post(`https://isbadmin.tn/api/createOrganisation_Of_Conferences`, data, { headers });
          await fetchOrganisation_Of_Conferences();
          break;
        case 'other':
          response = await axios.post(`https://isbadmin.tn/api/createOther_Information`, data, { headers });
          await fetchOther_Information();
          break;
        default:
          Alert.alert('Erreur', 'Section non reconnue');
          return;
      }

      Alert.alert('Succès', 'Élément ajouté avec succès');
      setModalVisible(false);
      setFormData({});
    } catch (error) {
      console.log('Erreur création:', error.response?.data || error.message);
      if (error.response) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Impossible d\'ajouter l\'élément';
        Alert.alert('Erreur', errorMessage);
      } else {
        Alert.alert('Erreur', 'Problème de connexion');
      }
    }
  };

  const openAddModal = (section) => {
    setCurrentSection(section);
    setFormData({});
    setModalVisible(true);
  };

  const Section = ({ title, data, icon, onAdd, renderItem, accentColor }) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
              <Ionicons name={icon} size={20} color="white" />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.sectionSubtitle}>
                {data.length} {data.length === 1 ? 'élément' : 'éléments'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={onAdd}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {data.length > 0 ? (
          <View style={styles.itemsContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.item}>
                {renderItem(item)}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="add-circle-outline" size={32} color={accentColor} />
            </View>
            <Text style={styles.emptyText}>Aucun élément ajouté</Text>
            <Text style={styles.emptySubtext}>Commencez par ajouter votre premier élément</Text>
          </View>
        )}
      </View>
    );
  };

  const renderModalForm = () => {
    const forms = {
      certifications: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>📜 Certificat</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du certificat"
              value={formData.name || ''}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date (YYYY-MM-DD)"
              value={formData.date}
              fieldName="date"
            />
          </View>
        </View>
      ),
      mobility: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>✈️ Période de mobilité</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de la mobilité"
              value={formData.name || ''}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date de début (YYYY-MM-DD)"
              value={formData.dateStart}
              fieldName="dateStart"
            />
            <DateInput
              placeholder="Date de fin (YYYY-MM-DD)"
              value={formData.dateEnd}
              fieldName="dateEnd"
            />
          </View>
        </View>
      ),
      internship: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>🌍 Stage international</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du stage"
              value={formData.name || ''}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date de début (YYYY-MM-DD)"
              value={formData.dateStart}
              fieldName="dateStart"
            />
            <DateInput
              placeholder="Date de fin (YYYY-MM-DD)"
              value={formData.dateEnd}
              fieldName="dateEnd"
            />
          </View>
        </View>
      ),
      voluntary: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>❤️ Travail volontaire</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du travail volontaire"
              value={formData.name || ''}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date de début (YYYY-MM-DD)"
              value={formData.dateStart}
              fieldName="dateStart"
            />
            <DateInput
              placeholder="Date de fin (YYYY-MM-DD)"
              value={formData.dateEnd}
              fieldName="dateEnd"
            />
          </View>
        </View>
      ),
      clubs: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>👥 Participation aux clubs</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description de votre participation"
              value={formData.description || ''}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date de début (YYYY-MM-DD)"
              value={formData.dateStart}
              fieldName="dateStart"
            />
            <DateInput
              placeholder="Date de fin (YYYY-MM-DD)"
              value={formData.dateEnd}
              fieldName="dateEnd"
            />
          </View>
        </View>
      ),
      awards: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>🏆 Prix et récompenses</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du prix ou récompense"
              value={formData.name || ''}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date (YYYY-MM-DD)"
              value={formData.date}
              fieldName="date"
            />
          </View>
        </View>
      ),
      conferences: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>🎤 Organisation de conférences</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description de la conférence organisée"
              value={formData.description || ''}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date (YYYY-MM-DD)"
              value={formData.date}
              fieldName="date"
            />
          </View>
        </View>
      ),
      other: (
        <View>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>ℹ️ Autres informations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description des autres informations"
              value={formData.description || ''}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <DateInput
              placeholder="Date de début (YYYY-MM-DD)"
              value={formData.dateStart}
              fieldName="dateStart"
            />
            <DateInput
              placeholder="Date de fin (YYYY-MM-DD)"
              value={formData.dateEnd}
              fieldName="dateEnd"
            />
          </View>
        </View>
      ),
    };

    return forms[currentSection] || null;
  };


  if (loading) {
    return <Loading />;
  }


  return (
    <SafeAreaView style={styles.container}>
      <Header title="Activités" withBackButton  />
      
      <DynamicHeader 
        title="Mes Activités"
        subtitle="Gestion des activités étudiantes"
        iconName="star-outline"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >

        <Section
          title="Certificats obtenus"
          data={certifications}
          icon="ribbon"
          onAdd={() => openAddModal('certifications')}
          accentColor="#FF6B6B"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>📜 {item.name}</Text>
              <Text style={styles.itemDate}>📅 {item.date}</Text>
            </View>
          )}
        />

        <Section         
          title="Périodes de mobilité"
          data={mobilityPeriods}
          icon="airplane"
          onAdd={() => openAddModal('mobility')}
          accentColor="#3B82F6"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>✈️ {item.name}</Text>
              <Text style={styles.itemDate}>📅 {item.dateStart} - {item.dateEnd}</Text>
            </View>
          )}
        />

        <Section
          title="Stages internationaux"
          data={internships}
          icon="briefcase"
          onAdd={() => openAddModal('internship')}
          accentColor="#10B981"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>🌍 {item.name}</Text>
              <Text style={styles.itemDate}>📅 {item.dateStart} - {item.dateEnd}</Text>
            </View>
          )}
        />

        <Section
          title="Travail volontaire"
          data={voluntaryWork}
          icon="heart"
          onAdd={() => openAddModal('voluntary')}
          accentColor="#F59E0B"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>❤️ {item.name}</Text>
              <Text style={styles.itemDate}>📅 {item.dateStart} - {item.dateEnd}</Text>
            </View>
          )}
        />

        <Section
          title="Participation aux clubs"
          data={clubs}
          icon="people"
          onAdd={() => openAddModal('clubs')}
          accentColor="#059669"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>👥 {item.description}</Text>
              <Text style={styles.itemDate}>📅 {item.dateStart} - {item.dateEnd}</Text>
            </View>
          )}
        />

        <Section
          title="Prix et récompenses"
          data={awards}
          icon="trophy"
          onAdd={() => openAddModal('awards')}
          accentColor="#8B5CF6"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>🏆 {item.name}</Text>
              <Text style={styles.itemDate}>📅 {item.date}</Text>
            </View>
          )}
        />

        <Section
          title="Conférences organisées"
          data={conferences}
          icon="mic"
          onAdd={() => openAddModal('conferences')}
          accentColor="#EF4444"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>🎤 {item.description}</Text>
              <Text style={styles.itemDate}>📅 {item.date}</Text>
            </View>
          )}
        />

        <Section
          title="Autres informations"
          data={otherInfo}
          icon="information-circle"
          onAdd={() => openAddModal('other')}
          accentColor="#64748B"
          renderItem={(item) => (
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>ℹ️ {item.description}</Text>
              <Text style={styles.itemDate}>📅 {item.dateStart} - {item.dateEnd}</Text>
            </View>
          )}
        />

        <View style={styles.spacer} />
      </ScrollView>

      {/* Modal for adding new items */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentSection === 'certifications' && 'Ajouter un certificat'}
                {currentSection === 'mobility' && 'Ajouter une période de mobilité'}
                {currentSection === 'internship' && 'Ajouter un stage international'}
                {currentSection === 'voluntary' && 'Ajouter un travail volontaire'}
                {currentSection === 'clubs' && 'Ajouter une participation aux clubs'}
                {currentSection === 'awards' && 'Ajouter un prix ou récompense'}
                {currentSection === 'conferences' && 'Ajouter une conférence organisée'}
                {currentSection === 'other' && 'Ajouter une information'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {renderModalForm()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => createItem(currentSection, formData)}
              >
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userInfoContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userInfoText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
     marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsContainer: {
    marginTop: 8,
  },
  item: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
     marginTop: 22,
    padding: 12,
    marginBottom: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1e293b',
  },
  itemDate: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1e293b',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  calendarIconContainer: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
  },
  spacer: {
    height: 30,
  },
});

export default StudentActivitiesScreen;
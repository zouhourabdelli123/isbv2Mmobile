import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  Animated,
  FlatList,
  Modal,
  Alert,
  StatusBar,
  TextInput
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';
import DynamicHeader from './header';

const { width, height } = Dimensions.get('window');

export default function NotesScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({ total: 0, passed: 0, average: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedMatiere, setSelectedMatiere] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [moduleAverages, setModuleAverages] = useState({});
  const [uniqueModules, setUniqueModules] = useState([]);

  const { year, semester } = route.params || {};

  useEffect(() => {
    fetchUserInfo();
    fetchNotes();

    Animated.stagger(150, [
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardsAnim, {
        toValue: 1,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 12,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setUserInfo(JSON.parse(userData));
    } catch (error) {
      console.log('Error fetching user info:', error);
    }
  };

  // Fonction pour extraire les modules uniques à partir des notes
  const extractUniqueModules = (notesData) => {
    if (!notesData || !notesData.notes) return [];
    const modules = [...new Set(notesData.notes.map(note => note.element))];
    return modules.map(element => ({ module: element }));
  };

  const calculateModuleAverages = (notesData) => {
    if (!notesData || !notesData.notes) return {};
    
    const moduleGroups = {};
    
    // Grouper les notes par module (element)
    notesData.notes.forEach(note => {
      if (!moduleGroups[note.element]) {
        moduleGroups[note.element] = [];
      }
      moduleGroups[note.element].push({
        type: note.type_evaluation,
        note: parseFloat(note.note)
      });
    });
    
    const averages = {};
    Object.keys(moduleGroups).forEach(module => {
      const notes = moduleGroups[module];
      
      let totalWeighted = 0;
      let totalCoeff = 0;
      let passed = 0;
      
      notes.forEach(note => {
        let coeff = 1; // Coefficient par défaut
        
        // Assigner des coefficients basés sur le type d'évaluation
        switch(note.type) {
          case 'DS1':
          case 'DS2': 
            coeff = 0.3; 
            break;
          case 'EXA': 
            coeff = 0.7; 
            break;
          case 'TP': 
          case 'TP1': 
          case 'TP2': 
          case 'TP3': 
            coeff = 0.2; 
            break;
          case 'PROJET': 
            coeff = 0.4; 
            break;
          case 'TEST': 
            coeff = 0.2; 
            break;
          default: 
            coeff = 0.3;
        }
        
        totalWeighted += note.note * coeff;
        totalCoeff += coeff;
        if (note.note >= 10) passed++;
      });
      
      const average = totalCoeff > 0 ? (totalWeighted / totalCoeff) : 0;
      
      averages[module] = {
        average: average.toFixed(2),
        totalNotes: notes.length,
        passed: passed,
        passRate: notes.length > 0 ? ((passed / notes.length) * 100).toFixed(1) : '0.0'
      };
    });
    
    return averages;
  };

  const calculateStats = (notesData) => {
    if (!notesData || !notesData.notes) return { total: 0, passed: 0, average: 0 };
    
    const moduleAvgs = calculateModuleAverages(notesData);
    const modules = Object.keys(moduleAvgs);
    
    if (modules.length === 0) return { total: 0, passed: 0, average: 0 };
    
    let totalWeighted = 0;
    let totalModules = 0;
    let passedModules = 0;
    
    modules.forEach(module => {
      const avg = parseFloat(moduleAvgs[module].average);
      totalWeighted += avg;
      totalModules++;
      if (avg >= 10) passedModules++;
    });
    
    const average = totalWeighted / totalModules;
    
    return { 
      total: totalModules, 
      passed: passedModules, 
      average: average.toFixed(2) 
    };
  };

  const fetchNotes = async () => {
    try {
      setRefreshing(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        return;
      }

      const response = await fetch(`${BASE_URL_APP}/getNotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annee: year, // Changé de 'year' à 'annee' selon l'API
          semestre: semester
        })
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setNotesData(data.result);
        const modules = extractUniqueModules(data.result);
        setUniqueModules(modules);
        setModuleAverages(calculateModuleAverages(data.result));
        setStats(calculateStats(data.result));
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de charger les notes');
      }
    } catch (error) {
      console.log('Erreur réseau:', error);
      Alert.alert('Erreur', 'Problème de connexion réseau');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedModule('all');
    setSelectedMatiere('all');
  };

  const getGradeColor = (note) => {
    const grade = parseFloat(note);
    if (grade >= 16) return '#10b981';
    if (grade >= 14) return '#3b82f6';
    if (grade >= 12) return '#f59e0b';
    if (grade >= 10) return '#06b6d4';
    return '#ef4444';
  };

  const getGradeLabel = (note) => {
    const grade = parseFloat(note);
    if (grade >= 16) return '⭐ Excellent';
    if (grade >= 14) return '👍 Très Bien';
    if (grade >= 12) return '✅ Bien';
    if (grade >= 10) return '☑️ Passable';
    return '❌ À repasser';
  };

  const getGradeIcon = (note) => {
    const grade = parseFloat(note);
    if (grade >= 16) return 'star';
    if (grade >= 14) return 'thumb-up';
    if (grade >= 12) return 'trending-up';
    if (grade >= 10) return 'check';
    return 'trending-down';
  };

  const renderFilters = () => (
    <Animated.View style={[styles.filtersContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#ffffff', '#f8fafc']}
        style={styles.filtersGradient}
      >
        <View style={styles.filtersHeader}>
          <MaterialIcons name="filter-list" size={24} color="#1e40af" />
          <Text style={styles.filtersTitle}>Filtres & Recherche</Text>
          <TouchableOpacity 
            onPress={() => setShowFilters(!showFilters)}
            style={styles.toggleFiltersButton}
          >
            <MaterialIcons 
              name={showFilters ? 'expand-less' : 'expand-more'} 
              size={24} 
              color="#1e40af" 
            />
          </TouchableOpacity>
        </View>
        
        {showFilters && (
          <View style={styles.filtersContent}>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une matière..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <MaterialIcons name="clear" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Matière</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedMatiere === 'all' && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedMatiere('all')}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedMatiere === 'all' && styles.filterChipTextActive
                  ]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {getUniqueModulesNames().map((module, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterChip,
                      selectedMatiere === module && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedMatiere(module)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedMatiere === module && styles.filterChipTextActive
                    ]}>
                      {module.length > 15 ? module.substring(0, 15) + '...' : module}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <MaterialIcons name="refresh" size={16} color="#1e40af" />
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderSubjectItem = ({ item, index }) => {
    const moduleNotes = getFilteredNotesForModule(item.module);
    
    return (
      <Animated.View
        style={[
          styles.subjectCard,
          {
            opacity: cardsAnim,
            transform: [{
              translateY: cardsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.cardGradient}
        >
          <View style={styles.subjectHeader}>
            <View style={[styles.subjectIcon, { backgroundColor: `hsl(${index * 60}, 70%, 95%)` }]}>
              <MaterialCommunityIcons 
                name="book-open-page-variant" 
                size={24} 
                color={`hsl(${index * 60}, 70%, 50%)`} 
              />
            </View>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectTitle}>{item.module}</Text>
              <Text style={styles.subjectSubtitle}>
                {moduleNotes.length} évaluation(s)
                {moduleAverages[item.module] && (
                  ` • Moyenne: ${moduleAverages[item.module].average}/20`
                )}
              </Text>
            </View>
          </View>
          
          <View style={styles.notesContainer}>
            {moduleNotes.map((note, noteIndex) => (
              <React.Fragment key={noteIndex}>
                <TouchableOpacity 
                  style={[
                    styles.noteItem,
                    { borderLeftColor: getGradeColor(note.note) }
                  ]}
                  onPress={() => {
                    setSelectedNote(note);
                    setModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.noteInfo}>
                    <Text style={styles.noteType}>{note.type_evaluation}</Text>
                    <Text style={styles.noteDate}>
                      <MaterialIcons name="schedule" size={14} color="#94a3b8" />
                      {' '}Semestre {semester}
                    </Text>
                  </View>
                  
                  <View style={styles.noteValueContainer}>
                    <View style={[
                      styles.gradeBadge,
                      { backgroundColor: getGradeColor(note.note) + '20' }
                    ]}>
                      <Text style={[
                        styles.gradeValue,
                        { color: getGradeColor(note.note) }
                      ]}>
                        {note.note}
                      </Text>
                    </View>
                    <Text style={[
                      styles.gradeLabel,
                      { color: getGradeColor(note.note) }
                    ]}>
                      {getGradeLabel(note.note)}
                    </Text>
                  </View>
                </TouchableOpacity>
                {noteIndex < moduleNotes.length - 1 && <View style={styles.noteSeparator} />}
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const getFilteredData = () => {
    if (!uniqueModules) return [];
    
    let filteredMatieres = uniqueModules;
    
    if (selectedMatiere !== 'all') {
      filteredMatieres = filteredMatieres.filter(matiere => 
        matiere.module === selectedMatiere
      );
    }
    
    if (searchQuery.trim()) {
      filteredMatieres = filteredMatieres.filter(matiere =>
        matiere.module.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filteredMatieres;
  };

  const getFilteredNotesForModule = (module) => {
    if (!notesData || !notesData.notes) return [];
    
    let filteredNotes = notesData.notes.filter(note => note.element === module);
    
    if (selectedModule !== 'all') {
      filteredNotes = filteredNotes.filter(note => note.element === selectedModule);
    }
    
    return filteredNotes;
  };

  const getUniqueModulesNames = () => {
    if (!uniqueModules) return [];
    return uniqueModules.map(item => item.module);
  };

  if (loading) {
    return <Loading />;
  }

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <Header 
        title={`Notes S${semester}`} 
        subtitle={`Année ${year}`}
        withBackButton 
      />
      <DynamicHeader 
        title="Mes Notes"
        subtitle="Explorez vos résultats académiques"
        iconName="school"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1e40af', '#3b82f6']}
            tintColor="#1e40af"
          />
        }
      >
        {renderFilters()}
        
        <View style={styles.subjectsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Détail par Matière</Text>
            <Text style={styles.resultCount}>
              {filteredData.length} résultat(s)
            </Text>
          </View>
          
          {filteredData.length > 0 ? (
            <FlatList
              data={filteredData}
              renderItem={renderSubjectItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="school-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {searchQuery || selectedMatiere !== 'all' 
                  ? 'Aucun résultat trouvé' 
                  : 'Aucune note disponible'
                }
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedMatiere !== 'all'
                  ? 'Essayez de modifier vos critères de recherche'
                  : `Les notes pour le semestre ${semester} n'ont pas encore été publiées`
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#1e40af', '#3b82f6']}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconContainer}>
                  <FontAwesome5 name="graduation-cap" size={24} color="white" />
                </View>
                <Text style={styles.modalTitle}>Détail de l'Évaluation</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            {selectedNote && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Informations Générales</Text>
                  
                  <View style={styles.modalRow}>
                    <View style={styles.modalRowIcon}>
                      <MaterialCommunityIcons name="book-open-variant" size={20} color="#3b82f6" />
                    </View>
                    <Text style={styles.modalLabel}>Matière</Text>
                    <Text style={styles.modalValue}>{selectedNote.element}</Text>
                  </View>
                  
                  <View style={styles.modalRow}>
                    <View style={styles.modalRowIcon}>
                      <MaterialCommunityIcons name="clipboard-text" size={20} color="#3b82f6" />
                    </View>
                    <Text style={styles.modalLabel}>Type d'évaluation</Text>
                    <Text style={styles.modalValue}>{selectedNote.type_evaluation}</Text>
                  </View>

                  {moduleAverages[selectedNote.element] && (
                    <View style={styles.modalRow}>
                      <View style={styles.modalRowIcon}>
                        <MaterialCommunityIcons name="calculator" size={20} color="#3b82f6" />
                      </View>
                      <Text style={styles.modalLabel}>Moyenne du module</Text>
                      <Text style={[
                        styles.modalValue,
                        { color: getGradeColor(moduleAverages[selectedNote.element].average) }
                      ]}>
                        {moduleAverages[selectedNote.element].average}/20
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Résultat</Text>
                  
                  <View style={styles.gradeDisplayContainer}>
                    <View style={[
                      styles.largeGradeBadge,
                      { backgroundColor: getGradeColor(selectedNote.note) + '20' }
                    ]}>
                      <Text style={[
                        styles.largeGradeValue,
                        { color: getGradeColor(selectedNote.note) }
                      ]}>
                        {selectedNote.note}
                      </Text>
                      <Text style={styles.gradeScale}>/ 20</Text>
                    </View>
                    
                    <View style={styles.appreciationContainer}>
                      <MaterialIcons 
                        name={getGradeIcon(selectedNote.note)} 
                        size={24} 
                        color={getGradeColor(selectedNote.note)} 
                      />
                      <Text style={[
                        styles.gradeAppreciation,
                        { color: getGradeColor(selectedNote.note) }
                      ]}>
                        {getGradeLabel(selectedNote.note)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalFooter}>
                  <View style={styles.footerDivider} />
                  <Text style={styles.modalFooterText}>
                    <MaterialIcons name="school" size={16} color="#94a3b8" />
                    {' '}Semestre {semester} • Année Universitaire {year}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: { 
    paddingHorizontal: 16, 
    paddingBottom: 32, 
    paddingTop: 16 
  },
  filtersContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filtersGradient: {
    padding: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  toggleFiltersButton: {
    padding: 4,
  },
  filtersContent: {
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  clearSearchButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1e40af',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: 'white',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
    marginLeft: 6,
  },
  averagesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 14,
    marginLeft: 4,
  },
  averagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  averageCard: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  averageCardGradient: {
    padding: 14,
  },
  averageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  averageModuleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  averageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  averageValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  averageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  averageStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageStatText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#64748b',
  },
  subjectsContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 13,
    color: '#64748b',
  },
  subjectCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardGradient: {
    padding: 0,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  subjectSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  noteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  noteSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 12,
  },
  noteInfo: {
    flex: 1,
  },
  noteType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  noteDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  noteValueContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 4,
  },
  gradeValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalRowIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
    width: 120,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  gradeDisplayContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  largeGradeBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  largeGradeValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  gradeScale: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  appreciationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeAppreciation: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    marginTop: 16,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  modalFooterText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
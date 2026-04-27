import React, { useEffect, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL_APP } from '../api';
import Header from '../components/Header';
import DynamicHeader from './header';
import Loading from '../components/loading';
import { getUsableToken } from '../utils/auth';

const buildFormTitle = (item) => {
  const titre = item?.formulaire?.titre?.trim?.() || 'Formulaire';
  const moduleName = item?.matiere?.module?.trim?.() || 'Matiere';
  return `${titre} - ${moduleName}`;
};

const sortFormulaires = (items = []) =>
  [...items].sort((a, b) => {
    const first = buildFormTitle(a).toLowerCase();
    const second = buildFormTitle(b).toLowerCase();
    return first.localeCompare(second, 'fr', { sensitivity: 'base' });
  });

export default function FormulairesScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formulaires, setFormulaires] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));

  const fetchFormulaires = async () => {
    try {
      const token = await getUsableToken();
      const userData = await AsyncStorage.getItem('userData');

      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      if (!token) {
        setFormulaires([]);
        return;
      }

      const response = await fetch(`${BASE_URL_APP}/liste_formulaires`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : [];
      setFormulaires(sortFormulaires(items));

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
        }),
      ]).start();
    } catch (error) {
      console.log('[Formulaires] Erreur chargement:', error.message);
      setFormulaires([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFormulaires();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchFormulaires();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFormulaires();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Header title="Formulaires" withBackButton />

      <DynamicHeader
        title="Mes Formulaires"
        subtitle="Questionnaires non remplis"
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
      >
        {formulaires.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="assignment-late" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucun formulaire en attente</Text>
            <Text style={styles.emptyText}>
              Les formulaires non remplis apparaitront ici des qu'ils seront disponibles.
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.cardsContainer,
              {
                opacity: cardsAnim,
                transform: [
                  {
                    translateY: cardsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {formulaires.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${item.id_formulaire}-${item.id_matiere}-${index}`}
                style={styles.actionCard}
                onPress={() =>
                  navigation.navigate('FormulaireDetail', {
                    formulaireId: item.id_formulaire,
                    matiereId: item.id_matiere,
                    displayTitle: buildFormTitle(item),
                  })
                }
                activeOpacity={0.92}
              >
                <LinearGradient
                  colors={index % 2 === 0 ? ['#1E3A8A', '#3B82F6', '#60A5FA'] : ['#F59E0B', '#FBBF24', '#FCD34D']}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconContainer}>
                      <View style={styles.cardIconBg}>
                        <MaterialIcons
                          name="assignment"
                          size={32}
                          color={index % 2 === 0 ? '#F59E0B' : '#1E3A8A'}
                        />
                      </View>
                    </View>

                    <View style={styles.cardTextContainer}>
                      <Text style={[styles.cardTitle, index % 2 !== 0 && styles.goldText]}>
                        {item?.formulaire?.titre || 'Formulaire'}
                      </Text>
                      <Text style={[styles.cardSubtitle, index % 2 !== 0 && styles.goldSubText]}>
                        {item?.matiere?.module || 'Matiere'}
                      </Text>

                      <View style={styles.cardFeatures}>
                        <View style={styles.featureItem}>
                          <View style={[styles.featureDot, index % 2 !== 0 && styles.goldDot]} />
                          <Text style={[styles.featureText, index % 2 !== 0 && styles.goldFeatureText]}>
                            Questionnaire a completer
                          </Text>
                        </View>
                        <View style={styles.featureItem}>
                          <View style={[styles.featureDot, index % 2 !== 0 && styles.goldDot]} />
                          <Text style={[styles.featureText, index % 2 !== 0 && styles.goldFeatureText]}>
                            Ouvrir et repondre
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardArrow}>
                      <View style={[styles.arrowContainer, index % 2 !== 0 && styles.goldArrow]}>
                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color={index % 2 === 0 ? '#1E3A8A' : '#F59E0B'}
                        />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  cardsContainer: {
    gap: 20,
  },
  actionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    minHeight: 180,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    flex: 1,
  },
  cardIconContainer: {
    marginRight: 20,
  },
  cardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 15,
    marginBottom: 12,
  },
  cardFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 10,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
  },
  cardArrow: {
    marginLeft: 16,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldText: {
    color: '#1E3A8A',
  },
  goldSubText: {
    color: 'rgba(30, 58, 138, 0.85)',
  },
  goldFeatureText: {
    color: '#1E3A8A',
  },
  goldDot: {
    backgroundColor: '#1E3A8A',
  },
  goldArrow: {
    backgroundColor: '#1E3A8A',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: '#64748B',
  },
});

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DynamicHeader from './header';
import Header from '../components/Header';

const AbsencesScreen = () => {
  const navigation = useNavigation();
  const [absencesData, setAbsencesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);

  const fetchUserInfo = async () => {
    try {
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

  const fetchAbsences = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        return;
      }

      const response = await fetch(`https://isbadmin.tn/api/abcesncesParMatiere`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          return;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setAbsencesData(data || []); // S'assurer que data n'est pas null

    } catch (error) {
      console.log('Erreur:', error.message);
      
      if (error.message.includes('Network')) {
        Alert.alert('Erreur de connexion', 'Vérifiez votre connexion internet');
      } else {
        Alert.alert('Erreur', 'Impossible de récupérer les données d\'absences');
      }
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
    fetchAbsences();
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchAbsences();
    }, [])
  );

  const calculateTotal = (item) => {
    const absencesNJ = parseInt(item?.absencesNJ || 0);
    const absencesJ = parseInt(item?.absencesJ || 0);
    const presences = parseInt(item?.presences || 0);
    return absencesNJ + absencesJ + presences;
  };

  const getAbsencePercentage = (item) => {
    const total = calculateTotal(item);
    const totalAbsences = parseInt(item?.absencesNJ || 0) + parseInt(item?.absencesJ || 0);
    return total > 0 ? ((totalAbsences / total) * 100).toFixed(1) : '0';
  };

  const getStatusColor = (percentage) => {
    const num = parseFloat(percentage);
    if (num <= 10) return '#1E3A8A';
    if (num <= 20) return '#D97706';
    return '#DC2626';
  };

  const renderAbsenceCard = (item, index) => {
    if (!item) return null;
    
const percentage = parseFloat(getAbsencePercentage(item));
    const statusColor = getStatusColor(percentage);
    const total = calculateTotal(item);

    return (
      <Animated.View 
        key={index}
        style={[
          styles.card,
          {
            opacity: cardsAnim,
            transform: [{
              translateY: cardsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}
      >
        <View style={[styles.cardHeader, { borderLeftColor: statusColor }]}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item?.module || 'Module inconnu'}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    <Text style={styles.statusText}>
  {percentage <= 10 ? 'Excellent' : percentage <= 20 ? 'Correct' : 'À surveiller'}
</Text>

            </View>
          </View>
          
          <View style={styles.percentageContainer}>
            <Text style={[styles.percentageText, { color: statusColor }]}>
              {percentage}%
            </Text>
            <Text style={styles.percentageLabel}>Absences</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatItem 
            value={item.absencesNJ || 0}
            label="Non justifiées"
            icon="close-circle"
            color="#DC2626"
          />
          <StatItem 
            value={item.absencesJ || 0}
            label="Justifiées"
            icon="alert-circle"
            color="#D97706"
          />
          <StatItem 
            value={item.presences || 0}
            label="Présences"
            icon="checkmark-circle"
            color="#1E3A8A"
          />
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Répartition des séances</Text>
            <Text style={styles.totalSessions}>{total} séances</Text>
          </View>
          <ProgressBar 
            presences={item.presences || 0}
            absencesJ={item.absencesJ || 0}
            absencesNJ={item.absencesNJ || 0}
            total={total}
          />
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
    <Header title="Absences" withBackButton />

      <DynamicHeader 
        title="Mes Absences"
        subtitle="Suivi de l'assiduité par matière"
        iconName="calendar-remove"
        userInfo={userInfo}
        slideAnim={slideAnim}
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Matières suivies</Text>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{absencesData.length}</Text>
            </View>
          </View>

          {absencesData.length > 0 ? (
            absencesData.map((item, index) => renderAbsenceCard(item, index))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Aucune donnée disponible</Text>
              <Text style={styles.emptyText}>
                Les informations sur les absences ne sont pas encore disponibles.
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={16} color="#1E3A8A" />
                <Text style={styles.refreshText}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Composants réutilisables
const StatItem = ({ value, label, icon, color }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProgressBar = ({ presences, absencesJ, absencesNJ, total }) => (
  <View style={styles.progressBar}>
    {total > 0 && (
      <>
        <View style={[
          styles.progressSegment, 
          { 
            width: `${(presences / total) * 100}%`,
            backgroundColor: '#1E3A8A'
          }
        ]} />
        <View style={[
          styles.progressSegment, 
          { 
            width: `${(absencesJ / total) * 100}%`,
            backgroundColor: '#D97706'
          }
        ]} />
        <View style={[
          styles.progressSegment, 
          { 
            width: `${(absencesNJ / total) * 100}%`,
            backgroundColor: '#DC2626'
          }
        ]} />
      </>
    )}
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  userHeader: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  counterBadge: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 8,
    borderLeftWidth: 4,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#64748B',
  },
  percentageContainer: {
    alignItems: 'center',
    marginLeft: 16,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  totalSessions: {
    fontSize: 13,
    color: '#64748B',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 8,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
  },
});

export default AbsencesScreen;
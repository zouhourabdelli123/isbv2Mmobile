import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  FlatList 
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DynamicHeader from '../screens/header';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width } = Dimensions.get('window');

export default function PaymentScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [payments, setPayments] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const fetchPayments = async () => {
    console.log('[fetchPayments] Début de la récupération des paiements...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('[fetchPayments] Token récupéré:', token);

      if (!token) {
        console.log('[fetchPayments] Token est null ou inexistant');
        throw new Error("Token is null");
      }

      const response = await fetch(`https://isbadmin.tn/api/getPaiement`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[fetchPayments] Réponse reçue avec status:', response.status);

      if (!response.ok) {
        console.log('[fetchPayments] Erreur réponse serveur:', response.status);
        throw new Error('Erreur lors de la récupération des paiements: ' + response.status);
      }

      const jsonResponse = await response.json();

      console.log('[fetchPayments] Données reçues:', JSON.stringify(jsonResponse, null, 2));

      // Extraire les paiements dans data.data.paiements
      const paiements = jsonResponse.data?.paiements || [];

      setPayments(paiements);

      // Extraire années uniques (annee_universitaire) et les trier décroissant
      const uniqueYears = [...new Set(paiements.map(p => p.annee_universitaire))].sort((a, b) => b - a);

      console.log('[fetchPayments] Années uniques extraites:', uniqueYears);

      setYears(uniqueYears);

      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.log('[fetchPayments] Erreur attrapée:', error.message);
    } finally {
      console.log('[fetchPayments] Fin de la récupération, mise à jour des états loading et refreshing');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  // Filtrer les paiements selon l'année sélectionnée
  const filteredPayments = payments.filter(payment => {
    if (selectedYear) return payment.annee_universitaire === selectedYear;
    return true;
  });

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Fonction pour obtenir le titre du paiement basé sur le mode de paiement
  const getPaymentTitle = (modePaiement) => {
    switch (modePaiement) {
      case 'CHEQUE VERSABLE':
        return 'Paiement par chèque';
      case 'ESPECE':
        return 'Paiement en espèces';
      case 'VIREMENT':
        return 'Virement bancaire';
      case 'CARTE':
        return 'Paiement par carte';
      default:
        return 'Paiement';
    }
  };

  // Fonction pour obtenir l'icône selon le mode de paiement
  const getPaymentIcon = (modePaiement) => {
    switch (modePaiement) {
      case 'CHEQUE VERSABLE':
        return 'receipt';
      case 'ESPECE':
        return 'attach-money';
      case 'VIREMENT':
        return 'account-balance';
      case 'CARTE':
        return 'credit-card';
      default:
        return 'payment';
    }
  };

  // Calcul des statistiques
  const totalAmount = payments.reduce((sum, p) => sum + (p.montant || 0), 0);
  const currentYearPayments = selectedYear 
    ? payments.filter(p => p.annee_universitaire === selectedYear)
    : payments;
  const currentYearAmount = currentYearPayments.reduce((sum, p) => sum + (p.montant || 0), 0);

  // Rendu d'un élément d'année
  const renderYearItem = ({ item: year, index }) => (
    <TouchableOpacity
      style={[
        styles.yearChip,
        selectedYear === year && styles.yearChipActive
      ]}
      onPress={() => setSelectedYear(year)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.yearChipText,
        selectedYear === year && styles.yearChipTextActive
      ]}>
        {year}
      </Text>
      {selectedYear === year && (
        <View style={styles.yearChipIndicator} />
      )}
    </TouchableOpacity>
  );

  const renderAllYearsItem = () => (
    <TouchableOpacity
      style={[
        styles.yearChip,
        styles.allYearsChip,
        !selectedYear && styles.yearChipActive
      ]}
      onPress={() => setSelectedYear(null)}
      activeOpacity={0.7}
    >
      <MaterialIcons name="all-inclusive" size={16} color={!selectedYear ? 'white' : '#6B7280'} />
      <Text style={[
        styles.yearChipText,
        styles.allYearsText,
        !selectedYear && styles.yearChipTextActive
      ]}>
        Toutes
      </Text>
      {!selectedYear && (
        <View style={styles.yearChipIndicator} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading />;
  }


  return (
    <View style={styles.container}>
      <Header title="Paiements" withBackButton />
      
   <DynamicHeader 
  title="Mes Paiements"
  subtitle="Gestion financière étudiante"
  iconName="school"
  slideAnim={slideAnim}
  colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
  stats={[
    {
      value: `${currentYearAmount.toLocaleString()} DT`,
      label: selectedYear ? `Total ${selectedYear}` : 'Total général'
    },
    {
      value: filteredPayments.length,
      label: 'Paiements'
    }
  ]}
/>

      {years.length > 0 && (
        <View style={styles.yearSelectorContainer}>
          <Text style={styles.yearSelectorTitle}>Année universitaire</Text>
          <View style={styles.yearSelectorWrapper}>
            {renderAllYearsItem()}
            <FlatList
              data={years}
              renderItem={renderYearItem}
              keyExtractor={(item) => item.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearsList}
              ItemSeparatorComponent={() => <View style={styles.yearItemSeparator} />}
            />
          </View>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
      >
        {filteredPayments.length > 0 ? (
          <Animated.View
            style={{
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }}
          >
            {/* Liste des paiements */}
            {filteredPayments.map((payment, index) => (
              <View 
                key={`${payment.date_paiement}-${payment.montant}-${index}`} 
                style={[
                  styles.paymentCard,
                  { marginBottom: index === filteredPayments.length - 1 ? 20 : 12 }
                ]}
              >
                <View style={styles.paymentCardHeader}>
                  <View style={styles.paymentIcon}>
                    <MaterialIcons 
                      name={getPaymentIcon(payment.id_mode_paiement)}
                      size={24} 
                      color="#1E3A8A"
                    />
                  </View>
                  
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>
                      {getPaymentTitle(payment.id_mode_paiement)}
                    </Text>
                    <View style={styles.paymentMeta}>
                      <MaterialIcons name="event" size={14} color="#6B7280" />
                      <Text style={styles.paymentDate}>
                        {formatDate(payment.date_paiement)}
                      </Text>
                    </View>
                    <View style={styles.paymentMeta}>
                      <MaterialIcons name="school" size={14} color="#6B7280" />
                      <Text style={styles.paymentDate}>
                        Année {payment.annee_universitaire}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.paymentAmountContainer}>
                    <Text style={styles.paymentAmount}>
                      {payment.montant.toLocaleString()} DT
                    </Text>
                    <View style={[styles.paymentStatus, styles.paymentStatusSuccess]}>
                      <MaterialIcons name="check-circle" size={12} color="#059669" />
                      <Text style={[styles.paymentStatusText, styles.paymentStatusTextSuccess]}>
                        Payé
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        ) : (
          <View style={styles.noPayments}>
            <View style={styles.noPaymentsIcon}>
              <MaterialCommunityIcons name="credit-card-off" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.noPaymentsText}>Aucun paiement trouvé</Text>
            <Text style={styles.noPaymentsSubtext}>
              {selectedYear ? `pour l'année ${selectedYear}` : 'pour cette période'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#374151' },
  
  headerGradient: { 
    paddingVertical: 30, 
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { alignItems: 'center' },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  headerSubtitle: { 
    color: 'rgba(255, 255, 255, 0.9)', 
    fontSize: 16, 
    marginBottom: 20 
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerStatItem: { 
    alignItems: 'center',
    flex: 1,
  },
  headerStatValue: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  headerStatLabel: { 
    color: 'rgba(255, 255, 255, 0.8)', 
    fontSize: 12, 
    marginTop: 2 
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },

  // Year selector styles
  yearSelectorContainer: {
    backgroundColor: 'white',
    marginTop: -12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  yearSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  yearSelectorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allYearsChip: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  allYearsText: {
    marginLeft: 4,
  },
  yearsList: {
    paddingRight: 16,
  },
  yearItemSeparator: {
    width: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    minWidth: 60,
    alignItems: 'center',
  },
  yearChipActive: { 
    backgroundColor: '#1E3A8A',
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  yearChipText: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#64748B' 
  },
  yearChipTextActive: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  yearChipIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
  },

  // Content styles
  content: { 
    paddingHorizontal: 20, 
    paddingBottom: 40, 
    paddingTop: 20 
  },
  
  // Payment card styles
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paymentCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  paymentIcon: { 
    marginRight: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: { flex: 1 },
  paymentTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  paymentDate: { 
    marginLeft: 6, 
    color: '#6B7280', 
    fontSize: 13 
  },
  paymentAmountContainer: { 
    alignItems: 'flex-end' 
  },
  paymentAmount: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    color: '#1E3A8A',
    marginBottom: 6,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusSuccess: { 
    backgroundColor: '#ECFDF5' 
  },
  paymentStatusText: { 
    fontSize: 12, 
    fontWeight: '600',
    marginLeft: 4,
  },
  paymentStatusTextSuccess: { 
    color: '#059669' 
  },

  // No payments styles
  noPayments: { 
    marginTop: 60, 
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noPaymentsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPaymentsText: { 
    color: '#6B7280', 
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noPaymentsSubtext: { 
    color: '#9CA3AF', 
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
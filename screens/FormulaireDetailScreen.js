import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL_APP } from '../api';
import Header from '../components/Header';
import { getUsableToken } from '../utils/auth';

const FORM_RESPONSE_ENDPOINT = `${BASE_URL_APP}/envoyerReponse`;

const sortQuestions = (questions = []) =>
  [...questions].sort((a, b) => {
    const firstNumber = Number.parseInt(String(a?.question || '').match(/^\d+/)?.[0] || '', 10);
    const secondNumber = Number.parseInt(String(b?.question || '').match(/^\d+/)?.[0] || '', 10);

    if (!Number.isNaN(firstNumber) && !Number.isNaN(secondNumber) && firstNumber !== secondNumber) {
      return firstNumber - secondNumber;
    }

    return (a?.id || 0) - (b?.id || 0);
  });

const sortResponses = (responses = []) =>
  [...responses].sort((a, b) => {
    const first = Number(a?.reponse);
    const second = Number(b?.reponse);

    if (!Number.isNaN(first) && !Number.isNaN(second)) {
      return second - first;
    }

    return String(a?.reponse || '').localeCompare(String(b?.reponse || ''), 'fr', {
      sensitivity: 'base',
    });
  });

export default function FormulaireDetailScreen({ navigation, route }) {
  const { formulaireId, matiereId, displayTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formulaireData, setFormulaireData] = useState(null);
  const [answers, setAnswers] = useState({});

  const fetchFormulaire = async () => {
    try {
      const token = await getUsableToken();

      if (!token) {
        Alert.alert('Session', "Token d'authentification manquant");
        setFormulaireData(null);
        return;
      }

      const response = await fetch(`${BASE_URL_APP}/affiche_formulaire/${formulaireId}/${matiereId}`, {
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
      const sortedQuestions = sortQuestions(data?.formulaire?.questions || []).map((question) => ({
        ...question,
        reponses: sortResponses(question?.reponses || []),
      }));

      setFormulaireData({
        ...data,
        formulaire: {
          ...(data?.formulaire || {}),
          questions: sortedQuestions,
        },
      });
    } catch (error) {
      console.log('[FormulaireDetail] Erreur chargement:', error.message);
      Alert.alert('Erreur', 'Impossible de charger le formulaire.');
      setFormulaireData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFormulaire();
  }, [formulaireId, matiereId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFormulaire();
  };

  const handleChoice = (questionId, responseItem) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        id: responseItem.id,
        reponse: responseItem.reponse,
      },
    }));
  };

  const handleText = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const validateAnswers = () => {
    const questions = formulaireData?.formulaire?.questions || [];

    for (const question of questions) {
      if (!question?.obligatoire) {
        continue;
      }

      const answer = answers[question.id];
      const isEmptyText = typeof answer === 'string' && answer.trim().length === 0;
      if (answer === undefined || answer === null || isEmptyText) {
        Alert.alert('Validation', 'Veuillez repondre a toutes les questions obligatoires.');
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const questions = formulaireData?.formulaire?.questions || [];
    const mappedResponses = questions
      .filter((question) => {
        const answer = answers[question.id];
        if (answer === undefined || answer === null) {
          return false;
        }

        if (typeof answer === 'string') {
          return answer.trim().length > 0;
        }

        return true;
      })
      .map((question) => {
        const answer = answers[question.id];

        if (String(question?.type) === '2') {
          return {
            id_question: question.id,
            id_reponse: answer.id,
            reponse: answer.reponse,
          };
        }

        return {
          id_question: question.id,
          reponse: String(answer).trim(),
        };
      });

    return {
      id_formulaire: formulaireId,
      formulaire_id: formulaireId,
      id_matiere: matiereId,
      matiere_id: matiereId,
      reponses: mappedResponses,
      responses: mappedResponses,
    };
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await getUsableToken();

      if (!token) {
        Alert.alert('Session', "Token d'authentification manquant");
        return;
      }

      const response = await fetch(FORM_RESPONSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const rawText = await response.text();

      if (!response.ok) {
        throw new Error(rawText || `Erreur HTTP: ${response.status}`);
      }

      Alert.alert('Succes', rawText || 'Reponse etudiant envoyee avec succes', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.log('[FormulaireDetail] Erreur envoi:', error.message);
      Alert.alert('Erreur API', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Chargement du formulaire...</Text>
      </View>
    );
  }

  const questions = formulaireData?.formulaire?.questions || [];

  return (
    <View style={styles.container}>
      <Header title="Ouvrir Formulaire" withBackButton />

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
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle} numberOfLines={4}>
            {displayTitle || formulaireData?.formulaire?.titre || 'Formulaire'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {formulaireData?.matiere || 'Veuillez completer les reponses demandees.'}
          </Text>
        </LinearGradient>

        {questions.map((question, index) => {
          const selectedAnswer = answers[question.id];
          const isChoiceQuestion = String(question?.type) === '2';

          return (
            <View key={question.id || index} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionIndex}>
                  <Text style={styles.questionIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.questionTextBlock}>
                  <Text style={styles.questionText}>{question.question}</Text>
                  <Text style={styles.questionMeta}>
                    {question?.obligatoire ? 'Obligatoire' : 'Optionnel'}
                  </Text>
                </View>
              </View>

              {isChoiceQuestion ? (
                <View style={styles.choicesContainer}>
                  {(question.reponses || []).map((responseItem) => {
                    const isSelected = selectedAnswer?.id === responseItem.id;

                    return (
                      <TouchableOpacity
                        key={responseItem.id}
                        style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                        onPress={() => handleChoice(question.id, responseItem)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                          {responseItem.reponse}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                  onChangeText={(value) => handleText(question.id, value)}
                  placeholder="Votre reponse..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                />
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={submitting ? ['#94A3B8', '#CBD5E1'] : ['#F59E0B', '#FBBF24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <MaterialIcons name="send" size={22} color="#1E293B" />
            )}
            <Text style={styles.submitText}>
              {submitting ? 'Envoi en cours...' : 'Envoyer mes reponses'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  questionIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionIndexText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '700',
  },
  questionTextBlock: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 6,
  },
  questionMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  choicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceButton: {
    minWidth: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  choiceButtonSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  choiceText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: 'white',
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  submitButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.85,
  },
  submitGradient: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
});

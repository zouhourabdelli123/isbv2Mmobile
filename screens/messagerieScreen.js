import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Keyboard
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DynamicHeader from './header';
import Header from '../components/Header';
import { BASE_URL_APP } from '../api.js';
import Loading from '../components/loading.js';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#1e3a8a',
  primaryLight: '#3b82f6',
  primaryDark: '#1e40af',
  secondary: '#f59e0b',
  secondaryLight: '#fcd34d',
  accent: '#10b981',
  accentLight: '#6ee7b7',
  
  // Gradient modernes
  gradient: {
    primary: ['#1e3a8a', '#3b82f6'],
    secondary: ['#f59e0b', '#fcd34d'],
    accent: ['#10b981', '#6ee7b7'],
    chat: ['#667eea', '#764ba2'],
    glass: 'rgba(255, 255, 255, 0.25)',
  },
  
  // Neutres raffinés
  white: '#FFFFFF',
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Messages bubble colors
  bubble: {
    user: '#1e3a8a',
    userSecondary: '#3b82f6',
    admin: '#ffffff',
    adminBorder: '#e2e8f0',
  },
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6'
};

export default function MessageScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [cardsAnim] = useState(new Animated.Value(0));
  const [headerAnim] = useState(new Animated.Value(0));
  const [userInfo, setUserInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(50);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const messageAnimations = useRef(new Map()).current;

  const fetchUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }

      // Animations séquentielles améliorées
      Animated.sequence([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.parallel([
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
        ])
      ]).start();

    } catch (error) {
      console.log('Error fetching user info:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations utilisateur');
    }
  };

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`https://isbadmin.tn/api/getMessages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.messages) {
        const sortedMessages = response.data.messages.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setMessages(sortedMessages);
        
        // Animation des messages avec effet cascade
        sortedMessages.forEach((message, index) => {
          if (!messageAnimations.has(message.id)) {
            const messageAnim = new Animated.Value(0);
            messageAnimations.set(message.id, messageAnim);
            
            setTimeout(() => {
              Animated.spring(messageAnim, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }).start();
            }, index * 80);
          }
        });
      }
    } catch (error) {
      console.log('Error fetching messages:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Animation du bouton d'envoi
    Animated.sequence([
      Animated.timing(new Animated.Value(1), {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(new Animated.Value(0.8), {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        `https://isbadmin.tn/api/sendMessage`,
        { content: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newMsg = response.data.message;
      const messageAnim = new Animated.Value(0);
      messageAnimations.set(newMsg.id, messageAnim);
      
      setMessages(prev => [newMsg, ...prev]);
      
      Animated.spring(messageAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
      
    } catch (error) {
      console.log('Error sending message:', error);
      setNewMessage(messageText);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays <= 7) {
      return `${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const renderMessage = ({ item, index }) => {
    const messageAnim = messageAnimations.get(item.id) || new Animated.Value(1);
    const isFromUser = item.user_id === userInfo?.id;
    
    return (
      <Animated.View
        style={[
          styles.messageCard,
          {
            opacity: messageAnim,
            transform: [
              {
                translateY: messageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: messageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[
          styles.messageContainer,
          isFromUser ? styles.userMessage : styles.adminMessage,
        ]}>
          {!isFromUser && (
            <View style={styles.avatarContainer}>
              <View style={styles.adminAvatar}>
                <MaterialIcons 
                  name="admin-panel-settings" 
                  size={20} 
                  color={COLORS.white} 
                />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isFromUser ? styles.userBubble : styles.adminBubble,
          ]}>
            <Text style={[
              styles.messageText,
              isFromUser ? styles.userMessageText : styles.adminMessageText
            ]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isFromUser ? styles.userMessageTime : styles.adminMessageTime
              ]}>
                {formatMessageDate(item.created_at)}
              </Text>
              {isFromUser && (
                <View style={styles.messageStatus}>
                  <MaterialIcons 
                    name="done-all" 
                    size={14} 
                    color="rgba(255,255,255,0.9)" 
                  />
                </View>
              )}
            </View>
          </View>

          {isFromUser && (
            <View style={styles.avatarContainer}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {userInfo?.nom?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: COLORS.success }]} />
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  useEffect(() => {
    fetchUserInfo();
    fetchMessages();
    
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header title="Messages" withBackButton navigation={navigation} />
      
      {/* Enhanced Header Section */}
      <Animated.View 
        style={[
          styles.chatHeader,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.chatHeaderContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrapper}>
              <MaterialCommunityIcons 
                name="message-reply-text" 
                size={24} 
                color={COLORS.primary} 
              />
            </View>
            <View>
              <Text style={styles.chatTitle}>Conversation</Text>
              <Text style={styles.chatSubtitle}>Administration ISB</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.messageCounter}>
              <Text style={styles.messageCounterText}>{messages.length}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Messages Section */}
      <Animated.View 
        style={[
          styles.messagesSection,
          {
            opacity: slideAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconContainer}>
                  <MaterialCommunityIcons 
                    name="message-outline" 
                    size={64} 
                    color={COLORS.primary} 
                  />
                  <View style={styles.floatingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                </View>
                <Text style={styles.emptyStateTitle}>Aucune conversation</Text>
                <Text style={styles.emptyStateText}>
                  Commencez votre première conversation avec l'administration
                </Text>
                <TouchableOpacity 
                  style={styles.startChatButton}
                  onPress={() => inputRef.current?.focus()}
                >
                  <MaterialIcons name="chat" size={20} color={COLORS.white} />
                  <Text style={styles.startChatButtonText}>Démarrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesList}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              inverted
              onScrollToIndexFailed={() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
            />
          )}
        </View>
      </Animated.View>

      {/* Enhanced Input Section */}
      <Animated.View 
        style={[
          styles.inputSection,
          { 
            paddingBottom: Platform.OS === 'ios' ? 
              keyboardHeight > 0 ? keyboardHeight - 30 : 34 : 20,
          },
          {
            opacity: cardsAnim,
            transform: [
              {
                translateY: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[
          styles.inputContainer,
          { 
            backgroundColor: inputFocused ? COLORS.white : COLORS.gray[50],
            borderColor: inputFocused ? COLORS.primary : COLORS.gray[200],
            shadowOpacity: inputFocused ? 0.15 : 0.05,
          }
        ]}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { 
                  height: Math.max(44, inputHeight),
                }
              ]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Tapez votre message..."
              placeholderTextColor={COLORS.gray[400]}
              multiline
              maxLength={500}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onContentSizeChange={(e) => {
                setInputHeight(e.nativeEvent.contentSize.height);
              }}
              enablesReturnKeyAutomatically
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: newMessage.trim() ? COLORS.primary : COLORS.gray[200],
                  shadowOpacity: newMessage.trim() ? 0.3 : 0,
                }
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <MaterialIcons 
                  name="send" 
                  size={22} 
                  color={newMessage.trim() ? COLORS.white : COLORS.gray[400]} 
                />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputFooter}>
            <Text style={styles.characterCount}>
              {newMessage.length}/500 caractères
            </Text>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  
  // Enhanced Chat Header
  chatHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    shadowColor: COLORS.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  chatSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  messageCounter: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
  },
  messageCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Messages Section
  messagesSection: {
    flex: 1,
    margin: 10,
    marginTop: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    shadowColor: COLORS.gray[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  messagesList: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  // Empty State Enhanced
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateCard: {
    backgroundColor: COLORS.white,
    padding: 48,
    borderRadius: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  emptyStateIconContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primary}08`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  floatingDots: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginBottom: 4,
  },
  dot1: { opacity: 1 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 0.4 },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '500',
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startChatButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Message Cards Enhanced
  messageCard: {
    marginBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  adminMessage: {
    justifyContent: 'flex-start',
  },

  // Enhanced Avatars
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // Enhanced Message Bubbles
  messageBubble: {
    maxWidth: width * 0.72,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: COLORS.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: COLORS.bubble.user,
    borderBottomRightRadius: 6,
    marginLeft: 12,
  },
  adminBubble: {
    backgroundColor: COLORS.bubble.admin,
    borderBottomLeftRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.bubble.adminBorder,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  userMessageText: {
    color: COLORS.white,
  },
  adminMessageText: {
    color: COLORS.gray[800],
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
    fontWeight: '600',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.85)',
  },
  adminMessageTime: {
    color: COLORS.gray[500],
  },
  messageStatus: {
    marginLeft: 4,
  },

  // Enhanced Input Section
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.gray[50],
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: COLORS.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray[800],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: COLORS.gray[50],
    maxHeight: 120,
    marginRight: 12,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.gray[400],
    fontWeight: '500',
  },
});
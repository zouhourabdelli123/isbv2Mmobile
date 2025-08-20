import React, {
  useState,
  useEffect
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated
} from 'react-native';
import {
  MaterialIcons
} from '@expo/vector-icons';
import {
  useNavigation
} from '@react-navigation/native';
import {
  Ionicons
} from '@expo/vector-icons';
import {
  LinearGradient
} from 'expo-linear-gradient';
import {
  BASE_URL_APP
} from '../api.js';

export default function Header({
  title,
  withBackButton = false
}) {
  const navigation = useNavigation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scaleValue] = useState(new Animated.Value(1));

  const loadData = async () => {
    await Promise.all([
      loadUserProfile(),
      fetchNotificationCount()
    ]);
  };

  const fetchNotificationCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log("No user token found");
        return;
      }

      const response = await fetch(`https://isbadmin.tn/api/getNotifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (!responseData || !Array.isArray(responseData.notifications)) {
        console.log("Invalid response structure:", responseData);
        throw new Error("Invalid response structure from server");
      }

      setNotificationCount(responseData.notifications.length);

    } catch (error) {
      console.log("Error fetching notification count:", error.message);
      setNotificationCount(0);
    }
  };

  const handlePress = (callback) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  return ( <
    >
    <
    StatusBar barStyle = "light-content"
    backgroundColor = "#0F172A" / >
    <
    View style = {
      styles.container
    } >
    <
    LinearGradient colors = {
      ['#1E40AF', '#1E3A8A', '#1E2A5A']
    }
    start = {
      {
        x: 0,
        y: 0
      }
    }
    end = {
      {
        x: 1,
        y: 1
      }
    }
    style = {
      styles.gradientBackground
    }
    />

    {
      /* Éléments décoratifs plus subtils */
    } <
    View style = {
      styles.floatingElement1
    }
    /> <
    View style = {
      styles.floatingElement2
    }
    /> <
    View style = {
      styles.shimmerLine
    }
    />

    <
    View style = {
      styles.glassOverlay
    }
    />

    <
    View style = {
      styles.content
    } > {
      /* Section gauche */
    } <
    View style = {
      styles.leftSection
    } > {
      withBackButton && ( <
        TouchableOpacity style = {
          styles.actionButton
        }
        onPress = {
          () => handlePress(() => navigation.goBack())
        }
        activeOpacity = {
          0.7
        } >
        <
        View style = {
          styles.buttonContainer
        } >
        <
        MaterialIcons name = "arrow-back"
        size = {
          20
        }
        color = "#FFFFFF" / >
        <
        /View> < /
        TouchableOpacity >
      )
    }

    <
    TouchableOpacity style = {
      styles.actionButton
    }
    onPress = {
      () => handlePress(() => navigation.navigate('Home'))
    }
    activeOpacity = {
      0.7
    } >
    <
    View style = {
      styles.buttonContainer
    } >
    <
    Ionicons name = "home"
    size = {
      18
    }
    color = "#FFFFFF" / >
    <
    /View> < /
    TouchableOpacity > <
    /View>

    {
      /* Section centrale - Titre */
    } <
    View style = {
      styles.titleSection
    } >
    <
    Text style = {
      styles.title
    }
    numberOfLines = {
      1
    } > {
      title
    } < /Text> <
    View style = {
      styles.titleUnderline
    }
    /> < /
    View >

    {
      /* Section droite - Actions */
    } <
    View style = {
      styles.rightSection
    } >
    <
    TouchableOpacity style = {
      styles.actionButton
    }
    onPress = {
      () => handlePress(() => navigation.navigate('Messagerie'))
    }
    activeOpacity = {
      0.7
    } >
    <
    View style = {
      styles.buttonContainer
    } >
    <
    Ionicons name = "chatbubble-outline"
    size = {
      18
    }
    color = "#FFFFFF" / >
    <
    /View> < /
    TouchableOpacity >

    <
    TouchableOpacity style = {
      styles.actionButton
    }
    onPress = {
      () => handlePress(() => navigation.navigate('notifications'))
    }
    activeOpacity = {
      0.7
    } >
    <
    View style = {
      styles.buttonContainer
    } >
    <
    Ionicons name = "notifications-outline"
    size = {
      18
    }
    color = "#FFFFFF" / >
    <
    /View> < /
    TouchableOpacity >

    <
    TouchableOpacity style = {
      styles.profileButton
    }
    onPress = {
      () => handlePress(() => navigation.navigate('Profile'))
    }
    activeOpacity = {
      0.7
    } >
    <
    View style = {
      styles.profileContainer
    } >
    <
    Ionicons name = "person-circle-outline"
    size = {
      22
    }
    color = "#FFFFFF" / >
    <
    View style = {
      styles.profileIndicator
    }
    /> < /
    View > <
    /TouchableOpacity> < /
    View > <
    /View> < /
    View > <
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 100 : 80,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingElement1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    transform: [{
      rotate: '45deg'
    }],
  },
  floatingElement2: {
    position: 'absolute',
    top: -15,
    left: -25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    transform: [{
      rotate: '-30deg'
    }],
  },
  shimmerLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 0
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 25,
    paddingBottom: 12,
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
  },
  titleSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    position: 'relative',
  },
  buttonContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButton: {
    marginLeft: 4,
  },
  profileContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
  },
  profileIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: 'white',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    marginLeft: -40,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 4,
    letterSpacing: 0.3,
    maxWidth: '100%',
  },
  titleUnderline: {
    width: 40,
    height: 2,
    marginTop: 4,
    borderRadius: 1,
    marginLeft: -40,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 1,
  },
});
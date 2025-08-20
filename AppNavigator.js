import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from "./screens/LoginScreen";
import SplashScreen from './screens/SplashScreen';

import HomeScreen from "./screens/HomeScreen";
import NotesScreen from "./screens/NotesScreen";
import DocumentsScreen from "./screens/DemandeScreen";
import EmploiScreen from "./screens/EmploiScreen";
import DiplomeScreen from "./screens/DiplomeScreen";
import PaymentScreen from "./screens/PaymentScreen";
import Creedemande from "./screens/Creedemande";
import Recupererdemande from "./screens/Recupererdemande";
import semesterScreen from "./screens/semesterScreen";
import ProfilScreen from "./screens/ProfilScreen";
import notifications from "./screens/NotificationsScreen";
import Messagerie from "./screens/messagerieScreen";
import Absences from "./screens/AbsencesScreen";
const Stack = createNativeStackNavigator ();

export default function AppNavigator(props, ref) {
  return (
      <NavigationContainer ref={ref}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Emploi" component={EmploiScreen} />
        <Stack.Screen name="Diplome" component={DiplomeScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Creedemande" component={Creedemande} />
        <Stack.Screen name="Recupererdemande" component={Recupererdemande} />
        <Stack.Screen name="Semester" component={semesterScreen} />
        <Stack.Screen name="Profile" component={ProfilScreen} />
          <Stack.Screen name="notifications" component={notifications} />
          <Stack.Screen name="Messagerie" component={Messagerie} />
          <Stack.Screen name="Absences" component={Absences} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
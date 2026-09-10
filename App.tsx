import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AppProvider, useApp } from '@/state/AppContext';
import { ChatScreen } from '@/screens/ChatScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { PromptsScreen } from '@/screens/PromptsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RootDrawerParamList } from '@/navigation';

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function Root() {
  const { theme, lightMode, handleNewConversation } = useApp();

  const navTheme = {
    ...(lightMode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(lightMode === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Drawer.Navigator
        screenOptions={{
          drawerActiveTintColor: theme.accent,
          drawerInactiveTintColor: theme.textSecondary,
          drawerStyle: { backgroundColor: theme.surface },
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.textPrimary,
        }}
      >
        <Drawer.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Chat',
            headerRight: () => (
              <Pressable
                onPress={handleNewConversation}
                hitSlop={8}
                style={{ marginRight: 14 }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={26}
                  color={theme.accent}
                />
              </Pressable>
            ),
          }}
        />
        <Drawer.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'History' }}
        />
        <Drawer.Screen
          name="Prompts"
          component={PromptsScreen}
          options={{ title: 'Prompts' }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function StatusBarBridge() {
  const { lightMode } = useApp();
  return <StatusBar style={lightMode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBarBridge />
          <Root />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
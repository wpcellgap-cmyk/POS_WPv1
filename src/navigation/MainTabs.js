import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/main/DashboardScreen';
import StockStack from './StockStack';
import ServiceStack from './ServiceStack';
import CashierStack from './CashierStack';
import HistoryScreen from '../screens/history/HistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const insets = useSafeAreaInsets();
    const { primaryColor } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Service') {
                        iconName = focused ? 'construct' : 'construct-outline';
                    } else if (route.name === 'Stock') {
                        iconName = focused ? 'cube' : 'cube-outline';
                    } else if (route.name === 'Cashier') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: primaryColor,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
                    paddingBottom: insets.bottom > 0 ? insets.bottom - 5 : 8,
                    paddingTop: 8,
                    backgroundColor: theme.colors.white,
                }
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Service" component={ServiceStack} />
            <Tab.Screen name="Stock" component={StockStack} />
            <Tab.Screen name="Cashier" component={CashierStack} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

export default MainTabs;

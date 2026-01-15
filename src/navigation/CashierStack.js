import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CashierScreen from '../screens/cashier/CashierScreen';
import CheckoutScreen from '../screens/cashier/CheckoutScreen';

const Stack = createStackNavigator();

const CashierStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CashierMain" component={CashierScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
        </Stack.Navigator>
    );
};

export default CashierStack;

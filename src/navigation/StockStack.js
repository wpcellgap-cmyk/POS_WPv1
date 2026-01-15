import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProductListScreen from '../screens/stock/ProductListScreen';
import ProductFormScreen from '../screens/stock/ProductFormScreen';

const Stack = createStackNavigator();

const StockStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProductList" component={ProductListScreen} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        </Stack.Navigator>
    );
};

export default StockStack;

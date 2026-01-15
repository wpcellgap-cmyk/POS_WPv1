import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ServiceListScreen from '../screens/service/ServiceListScreen';
import ServiceFormScreen from '../screens/service/ServiceFormScreen';
import ReceiptPreviewScreen from '../screens/service/ReceiptPreviewScreen';

const Stack = createStackNavigator();

const ServiceStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ServiceList" component={ServiceListScreen} />
            <Stack.Screen name="ServiceForm" component={ServiceFormScreen} />
            <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} />
        </Stack.Navigator>
    );
};

export default ServiceStack;

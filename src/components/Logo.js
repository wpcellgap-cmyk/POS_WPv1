import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const Logo = ({ size = 'large' }) => {
    const { primaryColor } = useTheme();
    const isSmall = size === 'small';

    return (
        <View style={styles.container}>
            <View style={[styles.logoIcon, { backgroundColor: primaryColor }]}>
                <Ionicons name="calculator" size={isSmall ? 30 : 40} color={theme.colors.white} />
            </View>
            <Text style={[
                styles.title,
                { color: primaryColor },
                isSmall && styles.titleSmall
            ]}>WP CELL</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#1E88E5', // Fallback, context used in component
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        ...theme.shadow.sm,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.textPrimary,
    },
});

export default Logo;

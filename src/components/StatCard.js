import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable stat card component untuk dashboard
 */
const StatCard = ({ icon, label, value, color }) => {
    const { themeColors } = useTheme();

    return (
        <View style={[styles.statCard, { borderLeftColor: color, backgroundColor: themeColors.card }]}>
            <Ionicons name={icon} size={24} color={color} />
            <Text style={[styles.statValue, { color: themeColors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    statCard: {
        width: '48%',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        marginHorizontal: '1%',
        borderLeftWidth: 4,
        ...theme.shadow.sm,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
});

export default StatCard;


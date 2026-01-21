import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

/**
 * Reusable stat card component untuk dashboard
 */
const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    statCard: {
        width: '48%',
        backgroundColor: theme.colors.white,
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
        color: theme.colors.text,
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});

export default StatCard;

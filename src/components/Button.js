import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

const Button = ({ title, onPress, loading, variant = 'primary', style }) => {
    const { primaryColor } = useTheme();
    const isPrimary = variant === 'primary';
    const isLoading = !!loading;
    return (
        <TouchableOpacity
            style={[
                styles.button,
                isPrimary ? { backgroundColor: primaryColor } : styles.secondaryButton,
                style,
                isLoading && styles.disabled
            ]}
            onPress={onPress}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color={isPrimary ? theme.colors.white : primaryColor} />
            ) : (
                <Text style={[styles.text, isPrimary ? styles.primaryText : { color: primaryColor }]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 50,
        borderRadius: theme.borderRadius.l,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        ...theme.shadow.sm,
    },
    secondaryButton: {
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    disabled: {
        opacity: 0.7,
    },
    text: {
        ...theme.typography.button,
    },
    primaryText: {
        color: theme.colors.white,
    },
    secondaryText: {
        color: theme.colors.textPrimary,
    },
});

export default Button;

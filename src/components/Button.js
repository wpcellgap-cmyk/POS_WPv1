import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

const Button = ({ title, onPress, loading, variant = 'primary', style }) => {
    const { primaryColor, themeColors } = useTheme();
    const isPrimary = variant === 'primary';
    const isLoading = !!loading;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isPrimary
                    ? { backgroundColor: primaryColor }
                    : { backgroundColor: themeColors.card, borderWidth: 1, borderColor: themeColors.border },
                style,
                isLoading && styles.disabled
            ]}
            onPress={onPress}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color={isPrimary ? '#FFFFFF' : primaryColor} />
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
    disabled: {
        opacity: 0.7,
    },
    text: {
        ...theme.typography.button,
    },
    primaryText: {
        color: '#FFFFFF',
    },
});

export default Button;


import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    icon,
    error,
    keyboardType = 'default',
    autoCapitalize = 'none',
    multiline = false,
}) => {
    const { primaryColor, themeColors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = !!secureTextEntry;

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                { backgroundColor: themeColors.inputBackground, borderColor: themeColors.border },
                multiline && styles.inputContainerMultiline,
                error && styles.inputError,
                isFocused && { borderColor: primaryColor }
            ]}>
                {icon && (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={isFocused ? primaryColor : themeColors.textSecondary}
                        style={[styles.icon, multiline && styles.iconMultiline]}
                    />
                )}
                <TextInput
                    style={[styles.input, { color: themeColors.text }, multiline && styles.inputMultiline]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={themeColors.textSecondary}
                    secureTextEntry={isPassword && !isPasswordVisible}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                    textAlignVertical={multiline ? 'top' : 'center'}
                />
                {isPassword && (
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                        <Ionicons
                            name={isPasswordVisible ? "eye-off" : "eye"}
                            size={20}
                            color={themeColors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    label: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: 4,
        color: theme.colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.l,
        height: 46,
        paddingHorizontal: theme.spacing.m,
    },
    inputContainerMultiline: {
        height: 'auto',
        minHeight: 70,
        maxHeight: 120,
        alignItems: 'flex-start',
        paddingVertical: 6,
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    icon: {
        marginRight: theme.spacing.s,
    },
    iconMultiline: {
        marginTop: 4,
    },
    input: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 16,
    },
    inputMultiline: {
        minHeight: 60,
        maxHeight: 130,
        textAlignVertical: 'top',
        paddingTop: 0,
    },
    eyeIcon: {
        padding: 4,
    },
    errorText: {
        ...theme.typography.caption,
        color: theme.colors.error,
        marginTop: theme.spacing.xs,
    },
});

export default Input;

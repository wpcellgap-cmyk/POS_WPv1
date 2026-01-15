import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }) => {
    const { primaryColor } = useTheme();
    const [storeName, setStoreName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!storeName || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await register(email, password, storeName);
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Start your free trial today</Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="Store Name"
                                placeholder="e.g. Galaxy Accessories"
                                value={storeName}
                                onChangeText={setStoreName}
                                icon="storefront-outline"
                            />
                            <Input
                                label="Email Address"
                                placeholder="owner@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                icon="mail-outline"
                                autoCapitalize="none"
                            />
                            <Input
                                label="Password"
                                placeholder="Create a password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                icon="lock-closed-outline"
                            />

                            <Button title="Start Free Trial" onPress={handleRegister} loading={loading} style={styles.button} />

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={[styles.link, { color: primaryColor }]}>Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    backButton: {
        padding: theme.spacing.m,
    },
    content: {
        padding: theme.spacing.l,
        paddingTop: theme.spacing.xs,
    },
    header: {
        marginBottom: theme.spacing.l,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.subtitle,
    },
    form: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadow.sm,
    },
    button: {
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    link: {
        ...theme.typography.body,
        color: '#1E88E5', // Fallback
        fontWeight: 'bold',
    },
});

export default RegisterScreen;

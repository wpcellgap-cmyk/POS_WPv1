import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import { theme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
    const { primaryColor } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            Alert.alert('Login Failed', error.message);
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
                    <View style={styles.content}>
                        <Logo />

                        <View style={styles.form}>
                            <Text style={styles.headerTitle}>Welcome Back</Text>
                            <Text style={styles.headerSubtitle}>Sign in to manage your store</Text>

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
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                icon="lock-closed-outline"
                            />

                            <TouchableOpacity
                                style={styles.forgotPassword}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
                            </TouchableOpacity>

                            <Button title="Login" onPress={handleLogin} loading={loading} style={styles.button} />

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={[styles.link, { color: primaryColor }]}>Daftar Sekarang</Text>
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
        justifyContent: 'center',
    },
    content: {
        padding: theme.spacing.l,
        justifyContent: 'center',
    },
    form: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadow.sm,
    },
    headerTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    headerSubtitle: {
        ...theme.typography.subtitle,
        marginBottom: theme.spacing.l,
        textAlign: 'center',
        fontSize: 14,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: theme.spacing.l,
    },
    forgotPasswordText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    button: {
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

export default LoginScreen;

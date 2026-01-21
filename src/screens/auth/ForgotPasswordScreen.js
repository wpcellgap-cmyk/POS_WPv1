import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Logo from '../../components/Logo';

const ForgotPasswordScreen = ({ navigation }) => {
    const { sendPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleResetPassword = async () => {
        // Validation
        if (!email.trim()) {
            setError('Email wajib diisi');
            return;
        }

        if (!validateEmail(email)) {
            setError('Format email tidak valid');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await sendPasswordReset(email.trim());
            setSuccess(true);
            Alert.alert(
                'Email Terkirim',
                'Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Reset password error:', error);
            let errorMessage = 'Gagal mengirim email reset password';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Email tidak terdaftar';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Terlalu banyak percobaan. Coba lagi nanti.';
                    break;
                default:
                    errorMessage = error.message || 'Terjadi kesalahan';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Logo size="medium" />
                        <Text style={styles.title}>Lupa Password</Text>
                        <Text style={styles.subtitle}>
                            Masukkan email Anda dan kami akan mengirimkan link untuk reset password
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError('');
                            }}
                            placeholder="Masukkan email terdaftar"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon="mail-outline"
                            error={error}
                        />

                        {success && (
                            <View style={styles.successBox}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                <Text style={styles.successText}>
                                    Email berhasil dikirim! Silakan cek inbox Anda.
                                </Text>
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <Button
                                title="Kirim Link Reset"
                                onPress={handleResetPassword}
                                loading={loading}
                                disabled={success}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.backToLogin}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backToLoginText}>
                                Kembali ke Login
                            </Text>
                        </TouchableOpacity>
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
        padding: theme.spacing.lg,
    },
    backButton: {
        alignSelf: 'flex-start',
        padding: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        lineHeight: 20,
    },
    form: {
        flex: 1,
    },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success + '15',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
    },
    successText: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        color: theme.colors.success,
        fontSize: 14,
    },
    buttonContainer: {
        marginTop: theme.spacing.xl,
    },
    backToLogin: {
        alignItems: 'center',
        marginTop: theme.spacing.lg,
    },
    backToLoginText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default ForgotPasswordScreen;

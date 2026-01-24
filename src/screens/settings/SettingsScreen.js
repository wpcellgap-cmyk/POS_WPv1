import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBluetooth } from '../../context/BluetoothContext';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ReceiptTemplate from '../../components/ReceiptTemplate';

const THEME_OPTIONS = [
    { id: 'blue', name: 'Biru', color: '#1E88E5' },
    { id: 'green', name: 'Hijau', color: '#10B981' },
    { id: 'purple', name: 'Ungu', color: '#8B5CF6' },
    { id: 'orange', name: 'Oranye', color: '#F59E0B' },
    { id: 'red', name: 'Merah', color: '#EF4444' },
];

const SettingSection = ({ title, children, themeColors }) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, themeColors && { color: themeColors.textSecondary }]}>{title}</Text>
        <View style={[styles.sectionContent, themeColors && { backgroundColor: themeColors.card }]}>{children}</View>
    </View>
);

const SettingsScreen = ({ navigation }) => {
    const { ownerId, userProfile, logout } = useAuth();
    const { primaryColor, themeId, updateTheme, isDark, toggleDarkMode, themeColors } = useTheme();
    const { isConnected, isConnecting, connect, disconnect, device, isSupported, startScan, stopScan, scannedDevices, isScanning, pairDevice } = useBluetooth();
    const [storeName, setStoreName] = useState('');
    const [storeTagline, setStoreTagline] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isPairing, setIsPairing] = useState(false);

    // Service stats for profit tracking
    const [serviceStats, setServiceStats] = useState({
        totalIncome: 0,
        totalPartCost: 0,
        profit: 0,
        serviceCount: 0,
    });

    useEffect(() => {
        loadSettings();
        loadServiceStats();
    }, [ownerId]);

    const loadSettings = async () => {
        if (!ownerId) return;
        try {
            const settingsDoc = await getDoc(doc(db, 'users', ownerId, 'settings', 'store'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setStoreName(data.storeName || '');
                setStoreTagline(data.storeTagline || '');
                setStoreAddress(data.storeAddress || '');
                setStorePhone(data.storePhone || '');
            } else {
                setStoreName(userProfile?.storeName || '');
                setStoreTagline('Service HP Software & Hardware');
                setStoreAddress('');
                setStorePhone('');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadServiceStats = async () => {
        if (!ownerId) return;
        try {
            const servicesRef = collection(db, 'users', ownerId, 'services');
            const snapshot = await getDocs(servicesRef);

            let totalIncome = 0;
            let totalPartCost = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                totalIncome += parseFloat(data.cost) || 0;
                totalPartCost += parseFloat(data.partCost) || 0;
            });

            setServiceStats({
                totalIncome,
                totalPartCost,
                profit: totalIncome - totalPartCost,
                serviceCount: snapshot.size,
            });
        } catch (error) {
            console.error('Error loading service stats:', error);
        }
    };

    const handleConnect = async (deviceId) => {
        const success = await connect(deviceId);
        if (success) {
            Alert.alert('Berhasil', 'Printer terhubung.');
        } else {
            Alert.alert('Error', 'Gagal menghubungkan printer.');
        }
    };

    const handlePair = async (deviceAddress) => {
        setIsPairing(true);
        try {
            const paired = await pairDevice(deviceAddress);
            if (paired) {
                Alert.alert('Berhasil', 'Printer berhasil di-pair. Tap lagi untuk connect.');
            } else {
                Alert.alert('Gagal', 'Tidak bisa pair dengan printer.');
            }
        } catch (error) {
            Alert.alert('Error', 'Gagal pair: ' + error.message);
        } finally {
            setIsPairing(false);
        }
    };

    const handleDevicePress = async (dev) => {
        if (dev.bonded) {
            // Already paired, connect directly
            handleConnect(dev.address || dev.id);
        } else {
            // Not paired, pair first
            handlePair(dev.address || dev.id);
        }
    };

    const handleDisconnect = async () => {
        const success = await disconnect();
        if (success) {
            Alert.alert('Berhasil', 'Printer terputus.');
        }
    };

    const handleSave = async () => {
        if (!storeName.trim()) {
            Alert.alert('Error', 'Nama toko wajib diisi');
            return;
        }

        setLoading(true);
        try {
            const settingsData = {
                storeName: storeName.trim(),
                storeTagline: storeTagline.trim(),
                storeAddress: storeAddress.trim(),
                storePhone: storePhone.trim(),
                theme: themeId,
                updatedAt: new Date().toISOString(),
            };

            await setDoc(doc(db, 'users', ownerId, 'settings', 'store'), settingsData);
            Alert.alert('Berhasil', 'Pengaturan berhasil disimpan');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Gagal menyimpan pengaturan');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Yakin ingin keluar dari akun?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            Alert.alert('Error', 'Gagal logout');
                        }
                    }
                }
            ]
        );
    };

    const sampleServiceData = {
        serviceNumber: 'SVC-000001',
        customerName: 'Contoh Customer',
        customerPhone: '081234567890',
        phoneBrand: 'Samsung',
        phoneType: 'Galaxy A52',
        imei: '123456789012345',
        damageDescription: 'LCD Pecah',
        cost: 250000,
        warranty: '7 Hari',
        date: new Date(),
    };
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: themeColors.text }]}>Pengaturan</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Store Info Section */}
                <SettingSection title="Informasi Toko" themeColors={themeColors}>
                    <Input
                        label="Nama Toko"
                        value={storeName}
                        onChangeText={setStoreName}
                        placeholder="Nama toko Anda"
                        icon="storefront-outline"
                    />
                    <Input
                        label="Tagline"
                        value={storeTagline}
                        onChangeText={setStoreTagline}
                        placeholder="Deskripsi singkat toko"
                        icon="text-outline"
                    />
                    <Input
                        label="Alamat"
                        value={storeAddress}
                        onChangeText={setStoreAddress}
                        placeholder="Alamat lengkap toko"
                        icon="location-outline"
                    />
                    <Input
                        label="No. WhatsApp"
                        value={storePhone}
                        onChangeText={setStorePhone}
                        placeholder="08xxxxxxxxxx"
                        keyboardType="phone-pad"
                        icon="logo-whatsapp"
                    />
                </SettingSection>

                {/* Service Profit Report Section */}
                <SettingSection title="Laporan Service" themeColors={themeColors}>
                    <View style={styles.statsRow}>
                        <View style={styles.statsItem}>
                            <Ionicons name="trending-up-outline" size={20} color={theme.colors.success} />
                            <Text style={[styles.statsLabel, { color: themeColors.textSecondary }]}>Pendapatan Service</Text>
                            <Text style={[styles.statsValue, { color: themeColors.text }]}>
                                Rp {serviceStats.totalIncome.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statsItem}>
                            <Ionicons name="cube-outline" size={20} color={theme.colors.warning} />
                            <Text style={[styles.statsLabel, { color: themeColors.textSecondary }]}>Modal Part</Text>
                            <Text style={[styles.statsValue, { color: themeColors.text }]}>
                                Rp {serviceStats.totalPartCost.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statsDivider, { backgroundColor: themeColors.border }]} />
                    <View style={styles.statsRow}>
                        <View style={styles.statsItem}>
                            <Ionicons name="wallet-outline" size={20} color={serviceStats.profit >= 0 ? primaryColor : theme.colors.error} />
                            <Text style={[styles.statsLabel, { color: themeColors.textSecondary }]}>Laba (Profit)</Text>
                            <Text style={[styles.statsValue, styles.profitValue, { color: serviceStats.profit >= 0 ? primaryColor : theme.colors.error }]}>
                                Rp {serviceStats.profit.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.statsNote, { color: themeColors.textSecondary }]}>
                        Dari {serviceStats.serviceCount} service
                    </Text>
                </SettingSection>

                {/* Bluetooth Printer Section */}
                <SettingSection title="Printer Bluetooth" themeColors={themeColors}>
                    {isConnected ? (
                        <View style={styles.printerStatus}>
                            <View style={styles.printerInfo}>
                                <Ionicons name="print" size={24} color={primaryColor} />
                                <View style={styles.printerDetails}>
                                    <Text style={styles.printerName}>{device?.name || 'Printer Terhubung'}</Text>
                                    <Text style={styles.printerAddress}>{device?.id}</Text>
                                    <Text style={[styles.printerAddress, { color: theme.colors.success }]}>Status: Terhubung</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.disconnectButton, { borderColor: theme.colors.error }]}
                                onPress={handleDisconnect}
                            >
                                <Text style={[styles.disconnectText, { color: theme.colors.error }]}>Putuskan</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.noPrinter}>Belum ada printer terhubung</Text>
                            <Button
                                title={isScanning ? "Memindai..." : "Pindai Printer Bluetooth"}
                                onPress={startScan}
                                loading={isScanning}
                                icon="bluetooth-outline"
                            />

                            {scannedDevices.length > 0 && (
                                <View style={styles.deviceList}>
                                    <Text style={styles.deviceListTitle}>Perangkat Ditemukan:</Text>
                                    {scannedDevices.map((dev) => (
                                        <TouchableOpacity
                                            key={dev.id}
                                            style={styles.deviceItem}
                                            onPress={() => handleDevicePress(dev)}
                                            disabled={isConnecting || isPairing}
                                        >
                                            <Ionicons
                                                name={dev.bonded ? "print" : "print-outline"}
                                                size={20}
                                                color={dev.bonded ? primaryColor : theme.colors.textSecondary}
                                            />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.deviceName}>{dev.name || 'Unnamed Device'}</Text>
                                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                                                    {dev.id} {dev.bonded ? '(Paired)' : '(Tap to Pair)'}
                                                </Text>
                                            </View>
                                            {(isConnecting || isPairing) && device?.id === dev.id ? (
                                                <ActivityIndicator size="small" color={primaryColor} />
                                            ) : (
                                                <View style={[styles.actionBadge, { backgroundColor: dev.bonded ? primaryColor : theme.colors.warning }]}>
                                                    <Text style={styles.actionBadgeText}>
                                                        {dev.bonded ? 'Connect' : 'Pair'}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </SettingSection>

                {/* Dark Mode Toggle Section */}
                <SettingSection title="Mode Tampilan" themeColors={themeColors}>
                    <View style={styles.darkModeRow}>
                        <View style={styles.darkModeInfo}>
                            <Ionicons
                                name={isDark ? "moon" : "sunny"}
                                size={24}
                                color={primaryColor}
                            />
                            <View style={styles.darkModeTextContainer}>
                                <Text style={[styles.darkModeTitle, { color: themeColors.text }]}>
                                    Mode Gelap
                                </Text>
                                <Text style={[styles.darkModeSubtitle, { color: themeColors.textSecondary }]}>
                                    {isDark ? 'Aktif' : 'Nonaktif'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: '#767577', true: primaryColor + '60' }}
                            thumbColor={isDark ? primaryColor : '#f4f3f4'}
                        />
                    </View>
                </SettingSection>

                {/* Theme Section */}
                <SettingSection title="Pilihan Warna" themeColors={themeColors}>
                    <View style={styles.themeGrid}>
                        {THEME_OPTIONS.map((themeOption) => (
                            <TouchableOpacity
                                key={themeOption.id}
                                style={[
                                    styles.themeOption,
                                    themeId === themeOption.id && styles.themeOptionSelected
                                ]}
                                onPress={() => updateTheme(themeOption.id)}
                            >
                                <View style={[styles.themeColor, { backgroundColor: themeOption.color }]}>
                                    {themeId === themeOption.id && (
                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                    )}
                                </View>
                                <Text style={[
                                    styles.themeName,
                                    { color: themeColors.textSecondary },
                                    themeId === themeOption.id && { color: themeColors.text, fontWeight: '600' }
                                ]}>
                                    {themeOption.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </SettingSection>

                {/* Receipt Preview Section */}
                <SettingSection title="Header Nota" themeColors={themeColors}>
                    <TouchableOpacity
                        style={styles.previewToggle}
                        onPress={() => setShowPreview(!showPreview)}
                    >
                        <View style={styles.previewToggleLeft}>
                            <Ionicons name="receipt-outline" size={20} color={primaryColor} />
                            <Text style={styles.previewToggleText}>Preview Struk Nota</Text>
                        </View>
                        <Ionicons
                            name={showPreview ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showPreview && (
                        <View style={styles.previewContainer}>
                            <ReceiptTemplate
                                serviceData={sampleServiceData}
                                storeSettings={{
                                    storeName: storeName || 'Nama Toko',
                                    storeTagline: storeTagline || 'Tagline Toko',
                                    storeAddress: storeAddress || 'Alamat Toko',
                                    storePhone: storePhone || '08xxxxxxxxxx',
                                }}
                            />
                        </View>
                    )}
                </SettingSection>

                <View style={styles.saveButtonContainer}>
                    <Button
                        title="Simpan Pengaturan"
                        onPress={handleSave}
                        loading={loading}
                    />
                </View>

                {/* Account Section */}
                <SettingSection title="Akun" themeColors={themeColors}>
                    <View style={styles.accountCard}>
                        <View style={[styles.accountAvatar, { backgroundColor: primaryColor }]}>
                            <Text style={styles.accountAvatarText}>
                                {(userProfile?.storeName || 'U')[0].toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{userProfile?.storeName || 'User'}</Text>
                            <Text style={styles.accountEmail}>{userProfile?.email || '-'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutButton, { borderColor: theme.colors.error }]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </SettingSection>

                <View style={styles.footer}>
                    <Text style={styles.version}>POS Konter HP v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.spacing.xl * 4,
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContent: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.shadow.sm,
    },
    // Printer Styles
    printerStatus: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    printerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    printerDetails: {
        marginLeft: theme.spacing.sm,
    },
    printerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    printerAddress: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    disconnectButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
    },
    disconnectText: {
        fontSize: 12,
        fontWeight: '600',
    },
    noPrinter: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    deviceList: {
        marginTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    deviceListTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background,
    },
    deviceName: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
    },
    actionBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    actionBadgeText: {
        color: theme.colors.white,
        fontSize: 11,
        fontWeight: '600',
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
    },
    themeOption: {
        width: '20%',
        alignItems: 'center',
        padding: theme.spacing.xs,
    },
    themeOptionSelected: {},
    themeColor: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    themeName: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    themeNameSelected: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    previewToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    previewToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewToggleText: {
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
    },
    previewContainer: {
        marginTop: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    saveButtonContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    accountAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1E88E5', // Fallback, context color used in component
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountAvatarText: {
        color: theme.colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    accountInfo: {
        marginLeft: theme.spacing.md,
    },
    accountName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    accountEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    logoutText: {
        fontSize: 16,
        color: theme.colors.error,
        marginLeft: theme.spacing.xs,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
    },
    version: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    // Dark Mode Toggle Styles
    darkModeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    darkModeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    darkModeTextContainer: {
        marginLeft: theme.spacing.md,
    },
    darkModeTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    darkModeSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    // Service Stats Styles
    statsRow: {
        paddingVertical: theme.spacing.sm,
    },
    statsItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsLabel: {
        flex: 1,
        fontSize: 14,
        marginLeft: theme.spacing.sm,
    },
    statsValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    statsDivider: {
        height: 1,
        marginVertical: theme.spacing.sm,
    },
    profitValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
});

export default SettingsScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { useBluetooth } from '../../context/BluetoothContext';
import BluetoothService from '../../services/BluetoothService';
import EscPosEncoder from 'esc-pos-encoder';
import { collection, query, getDocs, orderBy, limit, getDoc, doc as fsDoc } from 'firebase/firestore';
import { Modal, Alert, ActivityIndicator } from 'react-native';

const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const DashboardScreen = ({ navigation }) => {
    const { userProfile, ownerId } = useAuth();
    const { primaryColor, themeColors } = useTheme();
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalServices: 0,
        todaySales: 0,
        todayTransactions: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [storeSettings, setStoreSettings] = useState(null);
    const [printing, setPrinting] = useState(false);

    const loadStats = async () => {
        if (!ownerId) return;

        try {
            // Get store settings for printing
            const settingsSnap = await getDoc(fsDoc(db, 'users', ownerId, 'settings', 'store'));
            if (settingsSnap.exists()) {
                setStoreSettings(settingsSnap.data());
            }

            // Get product count
            const productsSnap = await getDocs(collection(db, 'users', ownerId, 'products'));
            const totalProducts = productsSnap.size;

            // Get services count
            const servicesSnap = await getDocs(collection(db, 'users', ownerId, 'services'));
            const totalServices = servicesSnap.size;

            // Get today's transactions
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const transactionsSnap = await getDocs(
                query(collection(db, 'users', ownerId, 'transactions'), orderBy('createdAt', 'desc'), limit(5))
            );

            let todaySales = 0;
            let todayTransactions = 0;
            const recent = [];

            transactionsSnap.forEach(doc => {
                const data = doc.data();
                recent.push({ id: doc.id, ...data });

                if (data.createdAt) {
                    const txDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (txDate >= today) {
                        todaySales += data.total || 0;
                        todayTransactions++;
                    }
                }
            });

            setStats({ totalProducts, totalServices, todaySales, todayTransactions });
            setRecentTransactions(recent);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    useEffect(() => {
        loadStats();
    }, [ownerId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    const formatCurrency = (amount) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPaymentMethodLabel = (method) => {
        const labels = {
            cash: 'Tunai',
            transfer: 'Transfer',
            qris: 'QRIS'
        };
        return labels[method] || method;
    };

    const generateHtml = (transactionData, currentStoreSettings) => {
        const {
            storeName = 'WP CELL',
            storeTagline = 'Service HP Software & Hardware',
            storeAddress = 'Jln Kawi NO 121 Jenggawah',
            storePhone = '082333912221'
        } = currentStoreSettings || {};

        const date = transactionData.createdAt?.toDate ? transactionData.createdAt.toDate() : new Date(transactionData.createdAt);

        const itemsHtml = transactionData.items?.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="flex: 1;">${item.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span>${item.qty} x ${item.price.toLocaleString('id-ID')}</span>
                <span>${item.subtotal.toLocaleString('id-ID')}</span>
            </div>
        `).join('') || '';

        const pm = getPaymentMethodLabel(transactionData.paymentMethod);

        return `
            <html>
                <head>
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        body {
                            width: 54mm;
                            margin: 0 auto;
                            padding: 2mm 0;
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 10pt;
                            line-height: 1.2;
                            color: #000;
                        }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .divider { border-bottom: 1px dashed #000; margin: 2mm 0; }
                        .row { display: flex; justify-content: space-between; }
                        .footer-line { text-align: center; font-size: 9pt; margin-top: 1mm; }
                    </style>
                </head>
                <body>
                    <div class="center divider" style="padding-bottom: 2mm;">
                        <div style="font-size: 14pt; font-weight: bold;">${storeName}</div>
                        <div style="font-size: 10pt; margin-top: 1mm;">${storeTagline}</div>
                        <div style="font-size: 9pt;">${storeAddress}</div>
                        <div style="font-size: 9pt;">WA: ${storePhone}</div>
                    </div>
                    
                    <div class="row" style="font-size: 9pt; margin-bottom: 2mm;">
                        <span>Tgl: ${date.toLocaleDateString('id-ID')}</span>
                        <span>Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div class="divider">
                        ${itemsHtml}
                    </div>

                    <div style="margin-bottom: 2mm;">
                        <div class="row bold" style="font-size: 12pt;">
                            <span>TOTAL</span>
                            <span>Rp ${transactionData.total.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="row" style="font-size: 9pt; margin-top: 1mm;">
                            <span>Bayar (${pm})</span>
                            <span>${(transactionData.amountPaid || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="row" style="font-size: 9pt;">
                            <span>Kembalian</span>
                            <span>${(transactionData.change || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div class="center" style="margin-top: 4mm; border-top: 1px dashed #000; padding-top: 2mm;">
                        <div class="footer-line">Terima Kasih</div>
                        <div class="footer-line">Sudah Belanja di ${storeName}</div>
                    </div>
                </body>
            </html>
        `;
    };

    const { isConnected } = useBluetooth();

    const handlePrint = async (transactionData) => {
        setPrinting(true);
        try {
            console.log('=== BLUETOOTH PRINT START (Dashboard) ===');

            // Get store settings
            const storeSettingsDoc = await getDoc(fsDoc(db, 'users', ownerId, 'settings', 'store'));
            const settings = storeSettingsDoc.exists() ? storeSettingsDoc.data() : {
                storeName: userProfile?.storeName || 'WP CELL',
                storeTagline: 'Service HP Software & Hardware',
                storeAddress: '',
                storePhone: '',
            };

            // Check if there's a stored printer
            const storedDevice = await BluetoothService.getStoredDevice();
            console.log('Stored Device:', storedDevice);

            if (!storedDevice) {
                Alert.alert('Printer Tidak Terhubung', 'Silakan hubungkan printer di menu Pengaturan.');
                return;
            }

            // Check if device is actually connected
            const isActuallyConnected = await BluetoothService.isReallyConnected();
            console.log('Is Actually Connected:', isActuallyConnected);

            if (!isActuallyConnected) {
                // Device stored but not connected
                setPrinting(false);

                Alert.alert(
                    'Printer Tidak Terhubung',
                    `Printer ${storedDevice.name} tidak terhubung. Pastikan printer dalam keadaan ON dan Bluetooth aktif.`,
                    [
                        { text: 'Batal', style: 'cancel' },
                        {
                            text: 'Hubungkan',
                            onPress: async () => {
                                setPrinting(true);
                                try {
                                    console.log('Attempting to reconnect...');
                                    await BluetoothService.connectToDevice(storedDevice.address || storedDevice.id);
                                    console.log('Reconnected successfully');

                                    // Prepare and send print data
                                    const encoder = new EscPosEncoder();
                                    let result = encoder
                                        .initialize()
                                        .align('center')
                                        .bold(true)
                                        .line(settings.storeName)
                                        .bold(false)
                                        .line(settings.storeTagline)
                                        .line(`WA: ${settings.storePhone}`)
                                        .line('-'.repeat(32))
                                        .align('left');

                                    const date = transactionData.createdAt?.toDate ? transactionData.createdAt.toDate() : new Date(transactionData.createdAt);
                                    result
                                        .line(`Tgl: ${date.toLocaleDateString('id-ID')}`)
                                        .line(`Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
                                        .line('-'.repeat(32));

                                    transactionData.items?.forEach(item => {
                                        result.line(item.name)
                                        const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`;
                                        const subtotal = (item.subtotal || (item.price * item.qty)).toLocaleString('id-ID');
                                        const spaces = 32 - qtyPrice.length - subtotal.length;
                                        result.line(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
                                    });

                                    const pm = getPaymentMethodLabel(transactionData.paymentMethod);

                                    result
                                        .line('-'.repeat(32))
                                        .bold(true)
                                        .text('TOTAL')
                                        .text(' '.repeat(32 - 5 - transactionData.total.toLocaleString('id-ID').length - 3))
                                        .line(`Rp ${transactionData.total.toLocaleString('id-ID')}`)
                                        .bold(false)
                                        .line(`Bayar (${pm}): ${(transactionData.amountPaid || 0).toLocaleString('id-ID')}`)
                                        .line(`Kembalian: ${(transactionData.change || 0).toLocaleString('id-ID')}`)
                                        .line('-'.repeat(32))
                                        .align('center')
                                        .line('Terima Kasih')
                                        .line(`Sudah Belanja di ${settings.storeName}`)
                                        .newline()
                                        .newline()
                                        .newline()
                                        .cut()
                                        .encode();

                                    await BluetoothService.sendData(result);
                                    console.log('Print successful');
                                    Alert.alert('Berhasil', 'Struk berhasil dicetak.');
                                } catch (reconnectError) {
                                    console.error('Reconnect/Print Error:', reconnectError);
                                    Alert.alert('Koneksi Gagal', 'Tidak dapat terhubung ke printer. Pastikan printer menyala dan dalam jangkauan.');
                                } finally {
                                    setPrinting(false);
                                }
                            }
                        }
                    ]
                );
                return;
            }

            // Device is connected, proceed with print
            console.log('Printing via Bluetooth...');

            const encoder = new EscPosEncoder();
            let result = encoder
                .initialize()
                .align('center')
                .bold(true)
                .line(settings.storeName)
                .bold(false)
                .line(settings.storeTagline)
                .line(`WA: ${settings.storePhone}`)
                .line('-'.repeat(32))
                .align('left');

            const date = transactionData.createdAt?.toDate ? transactionData.createdAt.toDate() : new Date(transactionData.createdAt);
            result
                .line(`Tgl: ${date.toLocaleDateString('id-ID')}`)
                .line(`Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
                .line('-'.repeat(32));

            transactionData.items?.forEach(item => {
                result.line(item.name)
                const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`;
                const subtotal = (item.subtotal || (item.price * item.qty)).toLocaleString('id-ID');
                const spaces = 32 - qtyPrice.length - subtotal.length;
                result.line(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
            });

            const pm = getPaymentMethodLabel(transactionData.paymentMethod);

            result
                .line('-'.repeat(32))
                .bold(true)
                .text('TOTAL')
                .text(' '.repeat(32 - 5 - transactionData.total.toLocaleString('id-ID').length - 3))
                .line(`Rp ${transactionData.total.toLocaleString('id-ID')}`)
                .bold(false)
                .line(`Bayar (${pm}): ${(transactionData.amountPaid || 0).toLocaleString('id-ID')}`)
                .line(`Kembalian: ${(transactionData.change || 0).toLocaleString('id-ID')}`)
                .line('-'.repeat(32))
                .align('center')
                .line('Terima Kasih')
                .line(`Sudah Belanja di ${settings.storeName}`)
                .newline()
                .newline()
                .newline()
                .cut()
                .encode();

            await BluetoothService.sendData(result);
            console.log('Print successful');
            Alert.alert('Berhasil', 'Struk berhasil dicetak.');
        } catch (error) {
            console.error('=== PRINT ERROR (Dashboard) ===');
            console.error('Print error:', error);
            Alert.alert('Error', 'Gagal mencetak struk. Pastikan printer menyala.');
        } finally {
            setPrinting(false);
        }
    };

    const openDetail = (transaction) => {
        setSelectedTransaction(transaction);
        setModalVisible(true);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, { backgroundColor: primaryColor }]}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.storeName}>{userProfile?.storeName || 'Toko Anda'}</Text>
                    </View>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(userProfile?.storeName || 'T')[0].toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <StatCard
                        icon="cube-outline"
                        label="Produk"
                        value={stats.totalProducts}
                        color={primaryColor}
                    />
                    <StatCard
                        icon="construct-outline"
                        label="Service"
                        value={stats.totalServices}
                        color={theme.colors.warning}
                    />
                    <StatCard
                        icon="cart-outline"
                        label="Transaksi Hari Ini"
                        value={stats.todayTransactions}
                        color={theme.colors.success}
                    />
                    <StatCard
                        icon="cash-outline"
                        label="Penjualan Hari Ini"
                        value={formatCurrency(stats.todaySales)}
                        color="#9C27B0"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Menu Cepat</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Service')}>
                            <View style={[styles.quickIcon, { backgroundColor: primaryColor + '20' }]}>
                                <Ionicons name="add-circle" size={28} color={primaryColor} />
                            </View>
                            <Text style={[styles.quickLabel, { color: themeColors.text }]}>Tambah Service</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Cashier')}>
                            <View style={[styles.quickIcon, { backgroundColor: theme.colors.success + '20' }]}>
                                <Ionicons name="cart" size={28} color={theme.colors.success} />
                            </View>
                            <Text style={[styles.quickLabel, { color: themeColors.text }]}>Kasir</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Stock')}>
                            <View style={[styles.quickIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                                <Ionicons name="cube" size={28} color={theme.colors.warning} />
                            </View>
                            <Text style={[styles.quickLabel, { color: themeColors.text }]}>Stok</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {recentTransactions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Transaksi Terakhir</Text>
                        {recentTransactions.slice(0, 3).map((tx) => (
                            <TouchableOpacity key={tx.id} style={[styles.transactionItem, { backgroundColor: themeColors.card }]} onPress={() => openDetail(tx)}>
                                <View style={styles.txIcon}>
                                    <Ionicons name="receipt-outline" size={20} color={primaryColor} />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={[styles.txCount, { color: themeColors.text }]}>{tx.itemCount || tx.items?.length || 0} item</Text>
                                    <Text style={[styles.txDate, { color: themeColors.textSecondary }]}>
                                        {formatDate(tx.createdAt)}
                                    </Text>
                                </View>
                                <Text style={[styles.txAmount, { color: themeColors.text }]}>{formatCurrency(tx.total)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Detail Transaksi</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={themeColors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <View style={styles.modalBody}>
                                <Text style={[styles.modalDate, { color: themeColors.textSecondary }]}>
                                    {formatDate(selectedTransaction.createdAt)}
                                </Text>

                                <View style={[styles.itemsList, { backgroundColor: themeColors.background }]}>
                                    {selectedTransaction.items?.map((item, index) => (
                                        <View key={index} style={styles.detailItem}>
                                            <View style={styles.detailItemLeft}>
                                                <Text style={styles.detailItemName}>{item.name}</Text>
                                                <Text style={styles.detailItemQty}>
                                                    {formatCurrency(item.price)} x {item.qty}
                                                </Text>
                                            </View>
                                            <Text style={styles.detailItemSubtotal}>
                                                {formatCurrency(item.subtotal)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Total</Text>
                                    <Text style={styles.summaryValue}>{formatCurrency(selectedTransaction.total)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Metode</Text>
                                    <Text style={styles.summaryValue}>
                                        {getPaymentMethodLabel(selectedTransaction.paymentMethod)}
                                    </Text>
                                </View>
                                {selectedTransaction.paymentMethod === 'cash' && (
                                    <>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Dibayar</Text>
                                            <Text style={styles.summaryValue}>
                                                {formatCurrency(selectedTransaction.amountPaid)}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Kembalian</Text>
                                            <Text style={styles.summaryValue}>
                                                {formatCurrency(selectedTransaction.change)}
                                            </Text>
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity
                                    style={[styles.printButton, { backgroundColor: primaryColor }]}
                                    onPress={() => handlePrint(selectedTransaction)}
                                >
                                    <Ionicons name="print-outline" size={20} color={theme.colors.white} />
                                    <Text style={styles.printButtonText}>Cetak Struk</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.spacing.xl * 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: '#1E88E5', // Fallback, context color used in component style
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    greeting: {
        color: theme.colors.white,
        fontSize: 14,
        opacity: 0.9,
    },
    storeName: {
        color: theme.colors.white,
        fontSize: 22,
        fontWeight: 'bold',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: theme.colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: theme.spacing.md,
        marginTop: -theme.spacing.lg,
    },
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
    section: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickAction: {
        alignItems: 'center',
        width: '30%',
    },
    quickIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    quickLabel: {
        fontSize: 12,
        color: theme.colors.text,
        textAlign: 'center',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.sm,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E88E5' + '15', // Fallback, context used in component
        justifyContent: 'center',
        alignItems: 'center',
    },
    txInfo: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    txCount: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    txDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        padding: theme.spacing.lg,
    },
    modalDate: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    itemsList: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    detailItemLeft: {
        flex: 1,
    },
    detailItemName: {
        fontSize: 14,
        color: theme.colors.text,
    },
    detailItemQty: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    detailItemSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    printButton: {
        backgroundColor: '#1E88E5', // Fallback, context color used in component
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xl,
        ...theme.shadow.sm,
    },
    printButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: theme.spacing.sm,
    },
});

export default DashboardScreen;

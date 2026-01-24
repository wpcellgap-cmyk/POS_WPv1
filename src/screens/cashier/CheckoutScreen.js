import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBluetooth } from '../../context/BluetoothContext';
import BluetoothService from '../../services/BluetoothService';
import EscPosEncoder from 'esc-pos-encoder';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import Button from '../../components/Button';

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Tunai', icon: 'cash-outline' },
    { id: 'transfer', label: 'Transfer', icon: 'card-outline' },
    { id: 'qris', label: 'QRIS', icon: 'qr-code-outline' },
];

const CheckoutScreen = ({ navigation, route }) => {
    const { ownerId, userProfile } = useAuth();
    const { primaryColor, themeColors } = useTheme();
    const { cart, total } = route.params;
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [loading, setLoading] = useState(false);
    const [storeSettings, setStoreSettings] = useState(null);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!ownerId) return;
            try {
                const settingsDoc = await getDoc(doc(db, 'users', ownerId, 'settings', 'store'));
                if (settingsDoc.exists()) {
                    setStoreSettings(settingsDoc.data());
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, [ownerId]);

    const formatCurrency = (amount) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const getChange = () => {
        const paid = parseFloat(amountPaid) || 0;
        return Math.max(0, paid - total);
    };

    const generateHtml = (transactionData, currentStoreSettings) => {
        const {
            storeName = userProfile?.storeName || 'WP CELL',
            storeTagline = 'Service HP Software & Hardware',
            storeAddress = '',
            storePhone = ''
        } = currentStoreSettings || {};

        const itemsHtml = transactionData.items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="flex: 1;">${item.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span>${item.qty} x ${item.price.toLocaleString('id-ID')}</span>
                <span>${item.subtotal.toLocaleString('id-ID')}</span>
            </div>
        `).join('');

        const pm = PAYMENT_METHODS.find(m => m.id === transactionData.paymentMethod)?.label || transactionData.paymentMethod;

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
                        <span>Tgl: ${new Date().toLocaleDateString('id-ID')}</span>
                        <span>Jam: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <span>${transactionData.amountPaid.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="row" style="font-size: 9pt;">
                            <span>Kembalian</span>
                            <span>${transactionData.change.toLocaleString('id-ID')}</span>
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

    const { isConnected, disconnect } = useBluetooth();

    const handlePrint = async (transactionData) => {
        setPrinting(true);
        try {
            console.log('=== BLUETOOTH PRINT START (Checkout) ===');

            // Get store settings
            const settingsDoc = await getDoc(doc(db, 'users', ownerId, 'settings', 'store'));
            const settings = settingsDoc.exists() ? settingsDoc.data() : {
                storeName: userProfile?.storeName || 'WP CELL',
                storeTagline: 'Service HP Software & Hardware',
                storeAddress: '',
                storePhone: '',
            };

            // Check if there's a stored printer
            const storedDevice = await BluetoothService.getStoredDevice();
            console.log('Stored Device:', storedDevice);

            if (!storedDevice) {
                Alert.alert('Printer Tidak Tersedia', 'Belum ada printer yang terhubung. Silakan hubungkan printer di menu Pengaturan.');
                return;
            }

            // Check if device is actually connected
            const isActuallyConnected = await BluetoothService.isReallyConnected();
            console.log('Is Actually Connected:', isActuallyConnected);

            if (!isActuallyConnected) {
                // Try to reconnect automatically
                console.log('Attempting to reconnect...');
                try {
                    await BluetoothService.connectToDevice(storedDevice.address || storedDevice.id);
                    console.log('Reconnected successfully');
                } catch (reconnectError) {
                    console.error('Reconnect failed:', reconnectError);
                    Alert.alert(
                        'Koneksi Gagal',
                        `Tidak dapat terhubung ke printer ${storedDevice.name}. Pastikan printer dalam keadaan ON dan Bluetooth aktif.`
                    );
                    return;
                }
            }

            // Use the updated printSalesReceipt with raw ESC/POS commands
            console.log('Printing via Bluetooth (raw ESC/POS)...');
            await BluetoothService.printSalesReceipt(transactionData, settings);
            console.log('Print successful');
            Alert.alert('Berhasil', 'Struk berhasil dicetak.');
        } catch (error) {
            console.error('=== PRINT ERROR (Checkout) ===');
            console.error('Print Error:', error);
            Alert.alert('Error', 'Gagal mencetak struk: ' + error.message);
        } finally {
            setPrinting(false);
        }
    };

    const handleConfirm = async () => {
        if (paymentMethod === 'cash') {
            const paid = parseFloat(amountPaid) || 0;
            if (paid < total) {
                Alert.alert('Pembayaran Kurang', 'Jumlah bayar kurang dari total');
                return;
            }
        }

        setLoading(true);
        try {
            console.log('=== SAVING TRANSACTION ===');
            console.log('ownerId:', ownerId);

            if (!ownerId) {
                console.error('ERROR: ownerId is null or undefined!');
                Alert.alert('Error', 'User tidak terautentikasi. Silakan login ulang.');
                return;
            }

            const transactionData = {
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    qty: item.qty,
                    price: item.sellPrice,
                    subtotal: item.sellPrice * item.qty
                })),
                total,
                paymentMethod,
                amountPaid: paymentMethod === 'cash' ? parseFloat(amountPaid) : total,
                change: paymentMethod === 'cash' ? getChange() : 0,
                itemCount: cart.reduce((sum, item) => sum + item.qty, 0),
                createdAt: new Date(),
            };

            console.log('Transaction data:', JSON.stringify(transactionData, null, 2));

            // Save to Firestore (with serverTimestamp for real record)
            const dbData = { ...transactionData, createdAt: serverTimestamp() };
            const transactionPath = `users/${ownerId}/transactions`;
            console.log('Saving to path:', transactionPath);

            const docRef = await addDoc(collection(db, 'users', ownerId, 'transactions'), dbData);
            console.log('Transaction saved with ID:', docRef.id);

            // Update stock
            for (const item of cart) {
                const productRef = doc(db, 'users', ownerId, 'products', item.id);
                await updateDoc(productRef, {
                    stock: increment(-item.qty)
                });
                console.log(`Stock updated for ${item.name}`);
            }

            Alert.alert(
                'Transaksi Berhasil',
                `Total: ${formatCurrency(total)}\nKembalian: ${formatCurrency(transactionData.change)}`,
                [
                    {
                        text: 'Cetak Struk',
                        onPress: async () => {
                            await handlePrint(transactionData);
                            navigation.navigate('CashierMain');
                        }
                    },
                    {
                        text: 'Selesai',
                        onPress: () => {
                            navigation.navigate('CashierMain');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('=== Error saving transaction ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            Alert.alert('Error', 'Gagal menyimpan transaksi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: primaryColor }]}>Checkout</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Ringkasan Pesanan</Text>
                    <View style={[styles.orderSummary, { backgroundColor: themeColors.card }]}>
                        {cart.map((item) => (
                            <View key={item.id} style={styles.orderItem}>
                                <View style={styles.orderItemLeft}>
                                    <Text style={[styles.orderItemName, { color: themeColors.text }]}>{item.name}</Text>
                                    <Text style={[styles.orderItemQty, { color: themeColors.textSecondary }]}>x{item.qty}</Text>
                                </View>
                                <Text style={styles.orderItemPrice}>
                                    {formatCurrency(item.sellPrice * item.qty)}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.totalRow}>
                            <Text style={[styles.totalLabel, { color: themeColors.text }]}>Total</Text>
                            <Text style={[styles.totalAmount, { color: primaryColor }]}>{formatCurrency(total)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Metode Pembayaran</Text>
                    <View style={styles.paymentMethods}>
                        {PAYMENT_METHODS.map((method) => (
                            <TouchableOpacity
                                key={method.id}
                                style={[
                                    styles.paymentOption,
                                    paymentMethod === method.id && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
                                ]}
                                onPress={() => setPaymentMethod(method.id)}
                            >
                                <Ionicons
                                    name={method.icon}
                                    size={24}
                                    color={paymentMethod === method.id ? primaryColor : theme.colors.textSecondary}
                                />
                                <Text style={[
                                    styles.paymentLabel,
                                    paymentMethod === method.id && { color: primaryColor, fontWeight: '600' }
                                ]}>
                                    {method.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {paymentMethod === 'cash' && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Jumlah Bayar</Text>
                        <View style={[styles.inputContainer, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.currencyPrefix, { color: themeColors.textSecondary }]}>Rp</Text>
                            <TextInput
                                style={[styles.amountInput, { color: themeColors.text }]}
                                value={amountPaid}
                                onChangeText={setAmountPaid}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={themeColors.textSecondary}
                            />
                        </View>
                        <View style={styles.quickAmounts}>
                            {[total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, 100000].map((amount, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.quickButton}
                                    onPress={() => setAmountPaid(amount.toString())}
                                >
                                    <Text style={styles.quickButtonText}>{formatCurrency(amount)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.changeRow}>
                            <Text style={styles.changeLabel}>Kembalian</Text>
                            <Text style={styles.changeValue}>{formatCurrency(getChange())}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Konfirmasi Pembayaran"
                    onPress={handleConfirm}
                    loading={loading}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E88E5', // Fallback, context used in component
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    orderSummary: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.shadow.sm,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    orderItemLeft: {
        flex: 1,
    },
    orderItemName: {
        fontSize: 14,
        color: theme.colors.text,
    },
    orderItemQty: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    orderItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.sm,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    paymentMethods: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paymentOption: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
        borderWidth: 2,
        borderColor: 'transparent',
        ...theme.shadow.sm,
    },
    paymentOptionSelected: {
        borderColor: '#1E88E5', // Fallback
        backgroundColor: '#1E88E5' + '10', // Fallback
    },
    paymentLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    paymentLabelSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        ...theme.shadow.sm,
    },
    currencyPrefix: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginRight: theme.spacing.xs,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: theme.colors.text,
        paddingVertical: theme.spacing.md,
    },
    quickAmounts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: theme.spacing.sm,
    },
    quickButton: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        marginRight: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
        ...theme.shadow.sm,
    },
    quickButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    changeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.success + '20',
        borderRadius: theme.borderRadius.md,
    },
    changeLabel: {
        fontSize: 16,
        color: theme.colors.text,
    },
    changeValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    footer: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
    },
});

export default CheckoutScreen;

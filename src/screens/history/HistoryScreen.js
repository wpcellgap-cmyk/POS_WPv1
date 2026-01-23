import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import BluetoothService from '../../services/BluetoothService';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, onSnapshot, orderBy, getDoc, doc as fsDoc } from 'firebase/firestore';
import * as Print from 'expo-print';

const HistoryScreen = () => {
    const { ownerId } = useAuth();
    const { primaryColor, themeColors } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [storeSettings, setStoreSettings] = useState(null);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!ownerId) return;
            try {
                const settingsDoc = await getDoc(fsDoc(db, 'users', ownerId, 'settings', 'store'));
                if (settingsDoc.exists()) {
                    setStoreSettings(settingsDoc.data());
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, [ownerId]);

    useEffect(() => {
        if (!ownerId) return;
        // ... (rest of the useEffect for transactions)
        // I will use multi_replace for this if it's cleaner, but let's try to fit it here or use multi_replace.
        // Actually, I'll use multi_replace to handle the imports and the new functions/UI.

        const transactionsRef = collection(db, 'users', ownerId, 'transactions');
        const q = query(transactionsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transactionList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(transactionList);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching transactions:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId]);

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

    const generateHtml = (transactionData, storeSettings) => {
        const {
            storeName = 'WP CELL',
            storeTagline = 'Service HP Software & Hardware',
            storeAddress = 'Jln Kawi NO 121 Jenggawah',
            storePhone = '082333912221'
        } = storeSettings || {};

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

    const handlePrint = async (transactionData) => {
        setPrinting(true);
        try {
            // Get store settings
            const storeSettingsDoc = await getDoc(fsDoc(db, 'users', ownerId, 'settings', 'store'));
            const currentStoreSettings = storeSettingsDoc.exists() ? storeSettingsDoc.data() : {
                storeName: 'WP Cell', // Default if not found
                storeTagline: 'Service HP Software & Hardware',
                storeAddress: '',
                storePhone: '',
            };

            const printToPdf = async () => {
                const html = generateHtml(transactionData, currentStoreSettings);
                await Print.printAsync({
                    html,
                    width: 58 * 2.83,
                });
            };

            // Check for Bluetooth Printer
            const connectedPrinter = await BluetoothService.getStoredDevice();
            if (connectedPrinter) {
                try {
                    await BluetoothService.printSalesReceipt(transactionData, currentStoreSettings);
                    Alert.alert('Berhasil', 'Struk berhasil dicetak via Bluetooth');
                    return;
                } catch (error) {
                    console.error('Bluetooth Print Error:', error);
                    Alert.alert(
                        'Print Error',
                        'Gagal mencetak ke Bluetooth. Gunakan PDF sebagai cadangan?',
                        [
                            { text: 'Batal', style: 'cancel' },
                            {
                                text: 'Gunakan PDF', onPress: async () => {
                                    try {
                                        await printToPdf();
                                        Alert.alert('Berhasil', 'Struk berhasil dicetak via PDF');
                                    } catch (pdfError) {
                                        Alert.alert('Error', 'Gagal mencetak PDF');
                                    }
                                }
                            }
                        ]
                    );
                    return;
                }
            }

            await printToPdf();
            Alert.alert('Berhasil', 'Struk berhasil dicetak via PDF');
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Error', 'Gagal mencetak struk');
        } finally {
            setPrinting(false);
        }
    };

    const openDetail = (transaction) => {
        setSelectedTransaction(transaction);
        setModalVisible(true);
    };

    const renderTransaction = ({ item }) => (
        <TouchableOpacity style={[styles.transactionCard, { backgroundColor: themeColors.card }]} onPress={() => openDetail(item)}>
            <View style={styles.transactionHeader}>
                <View style={[styles.transactionIcon, { backgroundColor: primaryColor + '15' }]}>
                    <Ionicons name="receipt-outline" size={24} color={primaryColor} />
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDate, { color: themeColors.text }]}>{formatDate(item.createdAt)}</Text>
                    <Text style={[styles.transactionItems, { color: themeColors.textSecondary }]}>{item.itemCount || item.items?.length || 0} item</Text>
                </View>
                <View style={styles.transactionAmount}>
                    <Text style={[styles.transactionTotal, { color: themeColors.text }]}>{formatCurrency(item.total)}</Text>
                    <View style={[styles.paymentBadge, { backgroundColor: primaryColor + '15' }]}>
                        <Text style={[styles.paymentBadgeText, { color: primaryColor }]}>{getPaymentMethodLabel(item.paymentMethod)}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                <Text style={[styles.title, { color: primaryColor }]}>Riwayat Transaksi</Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>{transactions.length} transaksi</Text>
            </View>

            {transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>Belum ada transaksi</Text>
                    <Text style={styles.emptySubtext}>Transaksi akan muncul di sini</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Detail Transaksi</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={themeColors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalDate}>
                                    {formatDate(selectedTransaction.createdAt)}
                                </Text>

                                <View style={styles.itemsList}>
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
                                    <View style={styles.txIcon}>
                                        <Ionicons name="receipt-outline" size={20} color={primaryColor} />
                                    </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    listContainer: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.xl * 4,
    },
    transactionCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.sm,
    },
    transactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary + '15', // Using primaryColor from context
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDate: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    transactionItems: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    paymentBadge: {
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        marginTop: 4,
    },
    paymentBadgeText: {
        fontSize: 10,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.md,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
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
        backgroundColor: theme.colors.primary,
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

export default HistoryScreen;

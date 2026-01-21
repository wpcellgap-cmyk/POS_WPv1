import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import BluetoothService from '../../services/BluetoothService';
import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import Button from '../../components/Button';

const ReceiptPreviewScreen = ({ navigation, route }) => {
    const { primaryColor } = useTheme();
    const { serviceData, storeSettings, isPreviewOnly } = route.params;
    const [printing, setPrinting] = useState(false);
    const [loading, setLoading] = useState(false); // Added loading state for Bluetooth print

    const generateReceiptHtml = () => {
        const {
            serviceNumber = 'SVC-000001',
            customerName = '',
            customerPhone = '',
            phoneBrand = '',
            phoneType = '',
            imei = '',
            damageDescription = '',
            cost = 0,
            warranty = '-',
            date = new Date(),
        } = serviceData || {};

        const {
            storeName = 'WP CELL',
            storeTagline = 'Service HP Software & Hardware',
            storeAddress = 'Jln Kawi NO 121 Jenggawah',
            storePhone = '082333912221',
        } = storeSettings || {};

        const formatDate = (d) => {
            const dateObj = d instanceof Date ? d : new Date(d);
            return dateObj.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const formatTime = (d) => {
            const dateObj = d instanceof Date ? d : new Date(d);
            return dateObj.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const formatCurrency = (amount) => {
            return (amount || 0).toLocaleString('id-ID');
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @page {
                        size: 58mm auto;
                        margin: 0;
                    }
                    body {
                        width: 54mm;
                        margin: 0 auto;
                        padding: 2mm 0;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 10pt;
                        line-height: 1.2;
                        color: #000;
                        box-sizing: border-box;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 4px 0; }
                    .divider-star { text-align: center; letter-spacing: 2px; }
                    .row { display: flex; justify-content: space-between; }
                    .header-name { font-size: 14pt; font-weight: bold; margin-bottom: 2mm; }
                    .footer-line { text-align: center; font-size: 9pt; margin-top: 1mm; }
                </style>
            </head>
            <body>
                <div class="center header-name">${storeName}</div>
                <div class="center">${storeTagline}</div>
                <div class="center">${storeAddress}</div>
                <div class="center">WA : ${storePhone}</div>
                <div class="divider"></div>
                <div class="row">
                    <span>${formatDate(date)}</span>
                    <span>${formatTime(date)}</span>
                </div>
                <div>No Service : ${serviceNumber}</div>
                <div class="divider"></div>
                <div class="center bold">* Customer *</div>
                <div>Nama     : ${customerName}</div>
                <div>Nomor HP : ${customerPhone || '-'}</div>
                <div class="divider"></div>
                <div>Merk HP  : ${phoneBrand}</div>
                <div>Type HP  : ${phoneType || '-'}</div>
                <div>Imei     : ${imei || '-'}</div>
                <div>Kerusakan: ${damageDescription}</div>
                <div class="divider"></div>
                <div class="bold">Biaya    : Rp ${formatCurrency(cost)}</div>
                <div>Garansi  : ${warranty}</div>
                <div class="divider"></div>
                <div class="footer-line">Terima Kasih Atas Kepercayaan Anda</div>
                <div class="footer-line">Kepuasan Konsumen Adalah Prioritas Kami</div>
            </body>
            </html>
        `;
    };

    const printToPdf = async () => {
        const html = generateReceiptHtml();
        await Print.printAsync({
            html,
            width: 58 * 2.83, // 58mm in points (1mm = 2.83pt)
        });
    };

    const handlePrint = async () => {
        setPrinting(true);
        try {
            // Check for Bluetooth Printer first
            const connectedPrinter = await BluetoothService.getStoredDevice();
            if (connectedPrinter) {
                setLoading(true);
                try {
                    await BluetoothService.printServiceReceipt(serviceData, storeSettings);
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
                                        console.error('PDF Print Error:', pdfError);
                                        Alert.alert('Error', 'Gagal mencetak struk via PDF');
                                    }
                                }
                            }
                        ]
                    );
                    return;
                } finally {
                    setLoading(false);
                }
            }

            // If no connected printer or user chose PDF fallback
            await printToPdf();
            Alert.alert('Berhasil', 'Struk berhasil dicetak via PDF');
        } catch (error) {
            console.error('Print Error:', error);
            Alert.alert('Error', 'Gagal memproses pencetakan');
        } finally {
            setPrinting(false);
        }
    };

    const handleShare = async () => {
        try {
            const {
                serviceNumber,
                customerName,
                phoneBrand,
                phoneType,
                damageDescription,
                cost,
                warranty,
            } = serviceData;

            const message = `
STRUK SERVICE
${storeSettings?.storeName || 'WP CELL'}
${storeSettings?.storeAddress || ''}
WA: ${storeSettings?.storePhone || ''}

No: ${serviceNumber}
Customer: ${customerName}
HP: ${phoneBrand} ${phoneType}
Kerusakan: ${damageDescription}
Biaya: Rp ${(cost || 0).toLocaleString('id-ID')}
Garansi: ${warranty}

Terima kasih!
            `.trim();

            await Share.share({ message });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleDone = () => {
        if (isPreviewOnly) {
            navigation.goBack();
        } else {
            navigation.navigate('ServiceList');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={primaryColor} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: primaryColor }]}>Struk Nota</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.receiptWrapper}>
                    <ReceiptTemplate
                        serviceData={serviceData}
                        storeSettings={storeSettings}
                    />
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.infoText}>
                        Preview ini menunjukkan tampilan struk pada kertas thermal 58mm
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, printing && styles.disabled]}
                        onPress={handlePrint}
                        disabled={printing}
                    >
                        <Ionicons name="print-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.secondaryButtonText}>Cetak PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleDone}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isPreviewOnly ? 'Kembali' : 'Selesai'}
                        </Text>
                        <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
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
        color: theme.colors.text,
    },
    shareButton: {
        padding: theme.spacing.xs,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: theme.spacing.lg,
    },
    receiptWrapper: {
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        ...theme.shadow.md,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.lg,
    },
    infoText: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        fontSize: 13,
        color: theme.colors.primary,
    },
    footer: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        backgroundColor: theme.colors.white,
        ...theme.shadow.md,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.white,
    },
    secondaryButtonText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: theme.spacing.xs,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginRight: theme.spacing.xs,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default ReceiptPreviewScreen;

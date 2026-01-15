import { Platform } from 'react-native';
import Constants from 'expo-constants';
// import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import AsyncStorage from '@react-native-async-storage/async-storage';

let BLEPrinter;
try {
    const printerModule = require('react-native-thermal-receipt-printer-image-qr');
    BLEPrinter = printerModule.BLEPrinter;
} catch (e) {
    console.warn('Printer module not found (Expo Go?)');
}
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRINTER_STORAGE_KEY = '@bluetooth_printer_address';
const RECEIPT_WIDTH = 32;

class BluetoothPrinterService {
    constructor() {
        this.connectedDevice = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return true;
        // Check if running in Expo Go or if module is missing
        if (Constants.appOwnership === 'expo' || !BLEPrinter) {
            console.warn('Bluetooth Printing not supported in Expo Go');
            return false;
        }

        try {
            if (Platform.OS !== 'web') {
                await BLEPrinter.init();
                this.isInitialized = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('BLEPrinter Init Error:', error);
            return false;
        }
    }

    async getDeviceList() {
        try {
            await this.init();
            const devices = await BLEPrinter.getDeviceList();
            return devices || [];
        } catch (error) {
            console.error('Get Device List Error:', error);
            return [];
        }
    }

    async connect(device) {
        try {
            await this.init();
            const connected = await BLEPrinter.connectPrinter(device.inner_mac_address);
            if (connected) {
                this.connectedDevice = device;
                await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(device));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connect Printer Error:', error);
            return false;
        }
    }

    async disconnect() {
        try {
            await BLEPrinter.closeConn();
            this.connectedDevice = null;
            await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Disconnect Error:', error);
            return false;
        }
    }

    async getStoredDevice() {
        try {
            const stored = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    // Formatting Utilities
    centerText(text) {
        if (text.length >= RECEIPT_WIDTH) return text.substring(0, RECEIPT_WIDTH);
        const padding = Math.floor((RECEIPT_WIDTH - text.length) / 2);
        return ' '.repeat(padding) + text;
    }

    leftRightText(left, right) {
        const space = RECEIPT_WIDTH - left.toString().length - right.toString().length;
        if (space < 1) {
            // If it doesn't fit, put right on next line or truncate
            return left.substring(0, RECEIPT_WIDTH - right.toString().length - 1) + ' ' + right;
        }
        return left + ' '.repeat(space) + right;
    }

    divider(char = '-') {
        return char.repeat(RECEIPT_WIDTH);
    }

    async printServiceReceipt(serviceData, storeSettings) {
        try {
            const {
                serviceNumber = '',
                customerName = '',
                customerPhone = '',
                phoneBrand = '',
                phoneType = '',
                cost = 0,
                warranty = '-',
                date = new Date(),
            } = serviceData;

            const {
                storeName = '',
                storeTagline = '',
                storeAddress = '',
                storePhone = '',
            } = storeSettings;

            const formatDate = (d) => new Date(d).toLocaleDateString('id-ID');
            const formatTime = (d) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            let text = '';
            text += this.centerText(storeName) + '\n';
            if (storeTagline) text += this.centerText(storeTagline) + '\n';
            if (storeAddress) text += this.centerText(storeAddress) + '\n';
            text += this.centerText('WA: ' + storePhone) + '\n';
            text += this.divider('=') + '\n';

            text += this.leftRightText(formatDate(date), formatTime(date)) + '\n';
            text += 'No Service : ' + serviceNumber + '\n';
            text += this.divider('*') + '\n';

            text += this.centerText('Customer') + '\n';
            text += 'Nama     : ' + customerName + '\n';
            text += 'Nomor HP : ' + (customerPhone || '-') + '\n';
            text += this.divider() + '\n';

            text += 'Unit     : ' + phoneBrand + ' ' + phoneType + '\n';
            text += 'Kerusakan: ' + (serviceData.damageDescription || '-') + '\n';
            text += this.divider() + '\n';

            text += this.leftRightText('Biaya', 'Rp ' + (cost || 0).toLocaleString('id-ID')) + '\n';
            text += 'Garansi  : ' + warranty + '\n';
            text += this.divider('*') + '\n';

            text += this.centerText('Terima Kasih Atas') + '\n';
            text += this.centerText('Kepercayaan Anda') + '\n';
            text += this.centerText('Kepuasan Konsumen Adalah') + '\n';
            text += this.centerText('Prioritas Kami') + '\n';
            text += '\n\n\n'; // Feed paper

            await BLEPrinter.printRaw(text);
            return true;
        } catch (error) {
            console.error('Print Service Error:', error);
            throw error;
        }
    }

    async printSalesReceipt(transactionData, storeSettings) {
        try {
            const { storeName, storeTagline, storeAddress, storePhone } = storeSettings;
            const { items = [], total = 0, paymentMethod, amountPaid, change, createdAt } = transactionData;

            const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
            const formatDate = (d) => d.toLocaleDateString('id-ID');
            const formatTime = (d) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            let text = '';
            text += this.centerText(storeName) + '\n';
            if (storeTagline) text += this.centerText(storeTagline) + '\n';
            text += this.centerText('WA: ' + storePhone) + '\n';
            text += this.divider('=') + '\n';

            text += this.leftRightText(formatDate(date), formatTime(date)) + '\n';
            text += this.divider() + '\n';

            items.forEach(item => {
                text += item.name + '\n';
                text += this.leftRightText(`${item.qty} x ${item.price.toLocaleString('id-ID')}`, item.subtotal.toLocaleString('id-ID')) + '\n';
            });
            text += this.divider() + '\n';

            text += this.leftRightText('TOTAL', 'Rp ' + total.toLocaleString('id-ID')) + '\n';
            text += this.leftRightText('Bayar', amountPaid.toLocaleString('id-ID')) + '\n';
            text += this.leftRightText('Kembali', change.toLocaleString('id-ID')) + '\n';
            text += this.divider() + '\n';

            text += this.centerText('Terima Kasih') + '\n';
            text += this.centerText('Sudah Belanja di ' + storeName) + '\n';
            text += '\n\n\n';

            await BLEPrinter.printRaw(text);
            return true;
        } catch (error) {
            console.error('Print Sales Error:', error);
            throw error;
        }
    }
}

export default new BluetoothPrinterService();

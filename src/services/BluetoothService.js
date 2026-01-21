import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import EscPosEncoder from 'esc-pos-encoder';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORED_DEVICE_KEY = '@bluetooth_printer_device';

class BluetoothService {
    constructor() {
        this.manager = new BleManager();
        this.device = null;
        this.serviceUUID = null;
        this.characteristicUUID = null;
    }

    async requestPermissions() {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);
                return (
                    result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        return true;
    }

    scanDevices(onDeviceFound) {
        this.manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error('Scan error:', error);
                return;
            }
            if (device.name) {
                onDeviceFound(device);
            }
        });
    }

    stopScan() {
        this.manager.stopDeviceScan();
    }

    async connectToDevice(deviceId) {
        try {
            this.stopScan();
            console.log(`Connecting to ${deviceId}...`);
            const device = await this.manager.connectToDevice(deviceId);
            console.log('Connected, discovering services...');
            await device.discoverAllServicesAndCharacteristics();
            this.device = device;
            console.log('Services discovered');

            // Store device for later retrieval
            await this.storeDevice(device);

            return device;
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.device) {
            try {
                await this.device.cancelConnection();
                this.device = null;
                this.serviceUUID = null;
                this.characteristicUUID = null;
                await AsyncStorage.removeItem(STORED_DEVICE_KEY);
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        }
    }

    /**
     * Store device info for reconnection
     */
    async storeDevice(device) {
        try {
            const deviceInfo = {
                id: device.id,
                name: device.name,
            };
            await AsyncStorage.setItem(STORED_DEVICE_KEY, JSON.stringify(deviceInfo));
        } catch (error) {
            console.error('Error storing device:', error);
        }
    }

    /**
     * Get stored device info
     * @returns {Object|null} Device info atau null jika tidak ada
     */
    async getStoredDevice() {
        try {
            const deviceString = await AsyncStorage.getItem(STORED_DEVICE_KEY);
            if (deviceString) {
                return JSON.parse(deviceString);
            }
            // Fallback: return current device if connected
            if (this.device) {
                return {
                    id: this.device.id,
                    name: this.device.name,
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting stored device:', error);
            return null;
        }
    }

    /**
     * Check if currently connected
     * @returns {boolean}
     */
    isConnected() {
        return this.device !== null;
    }

    /**
     * Get current device
     * @returns {Object|null}
     */
    getDevice() {
        return this.device;
    }

    async sendData(data) {
        if (!this.device) {
            throw new Error('Device not connected');
        }

        // Find writable characteristic (simple approach: loop services)
        // Optimization: Cache service/char UUIDs after connection
        if (!this.serviceUUID || !this.characteristicUUID) {
            const services = await this.device.services();
            for (const service of services) {
                const characteristics = await service.characteristics();
                const writableChar = characteristics.find(c => c.isWritableWithoutResponse || c.isWritable);
                if (writableChar) {
                    this.serviceUUID = service.uuid;
                    this.characteristicUUID = writableChar.uuid;
                    break;
                }
            }
        }

        if (!this.serviceUUID || !this.characteristicUUID) {
            throw new Error('No writable characteristic found');
        }

        // Write data in chunks (native BLE often has MTU limits, e.g., 20 or 512 bytes)
        // Most thermal printers handle small chunks fine.
        const CHUNK_SIZE = 100;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            // Convert Uint8Array to Base64
            const nonNullChunk = chunk.filter(byte => byte != null); // Safety
            const base64Data = Buffer.from(nonNullChunk).toString('base64');

            await this.device.writeCharacteristicWithoutResponseForService(
                this.serviceUUID,
                this.characteristicUUID,
                base64Data
            );
        }
    }

    /**
     * Alias untuk sendData - untuk kompatibilitas
     * @param {Uint8Array} data - Data to send
     */
    async sendDataInChunks(data) {
        return this.sendData(data);
    }

    /**
     * Print service receipt ke thermal printer
     * @param {Object} serviceData - Data service
     * @param {Object} storeSettings - Pengaturan toko
     */
    async printServiceReceipt(serviceData, storeSettings) {
        if (!this.device) {
            throw new Error('Printer tidak terhubung');
        }

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
            storeAddress = '',
            storePhone = '',
        } = storeSettings || {};

        const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));

        const encoder = new EscPosEncoder();
        let result = encoder
            .initialize()
            .align('center')
            .bold(true)
            .line(storeName)
            .bold(false)
            .line(storeTagline);

        if (storeAddress) result.line(storeAddress);
        if (storePhone) result.line(`WA: ${storePhone}`);

        result
            .line('*'.repeat(32))
            .align('left')
            .line(`${dateObj.toLocaleDateString('id-ID')}   ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
            .line(`No Service : ${serviceNumber}`)
            .line('*'.repeat(32))
            .align('center')
            .bold(true)
            .line('* Customer *')
            .bold(false)
            .align('left')
            .line(`Nama     : ${customerName}`)
            .line(`Nomor HP : ${customerPhone || '-'}`)
            .line('-'.repeat(32))
            .line(`Merk HP  : ${phoneBrand}`)
            .line(`Type HP  : ${phoneType || '-'}`)
            .line(`Imei     : ${imei || '-'}`)
            .line(`Kerusakan: ${damageDescription}`)
            .line('-'.repeat(32))
            .bold(true)
            .line(`Biaya    : Rp ${(cost || 0).toLocaleString('id-ID')}`)
            .bold(false)
            .line(`Garansi  : ${warranty}`)
            .line('*'.repeat(32))
            .align('center')
            .line('Terima Kasih Atas Kepercayaan Anda')
            .line('Kepuasan Konsumen Adalah')
            .line('Prioritas Kami')
            .newline()
            .newline()
            .newline()
            .cut()
            .encode();

        await this.sendData(result);
    }

    /**
     * Print sales receipt ke thermal printer
     * @param {Object} transactionData - Data transaksi
     * @param {Object} storeSettings - Pengaturan toko
     */
    async printSalesReceipt(transactionData, storeSettings) {
        if (!this.device) {
            throw new Error('Printer tidak terhubung');
        }

        const {
            storeName = 'WP CELL',
            storeTagline = 'Service HP Software & Hardware',
            storeAddress = '',
            storePhone = '',
        } = storeSettings || {};

        const date = transactionData.createdAt?.toDate
            ? transactionData.createdAt.toDate()
            : new Date(transactionData.createdAt || new Date());

        const getPaymentLabel = (method) => {
            const labels = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };
            return labels[method] || method;
        };

        const encoder = new EscPosEncoder();
        let result = encoder
            .initialize()
            .align('center')
            .bold(true)
            .line(storeName)
            .bold(false)
            .line(storeTagline);

        if (storeAddress) result.line(storeAddress);
        if (storePhone) result.line(`WA: ${storePhone}`);

        result
            .line('-'.repeat(32))
            .align('left')
            .line(`Tgl: ${date.toLocaleDateString('id-ID')}`)
            .line(`Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`)
            .line('-'.repeat(32));

        // Print items
        transactionData.items?.forEach(item => {
            result.line(item.name);
            const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`;
            const subtotal = (item.subtotal || (item.price * item.qty)).toLocaleString('id-ID');
            const spaces = 32 - qtyPrice.length - subtotal.length;
            result.line(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
        });

        const pm = getPaymentLabel(transactionData.paymentMethod);

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
            .line(`Sudah Belanja di ${storeName}`)
            .newline()
            .newline()
            .newline()
            .cut()
            .encode();

        await this.sendData(result);
    }

    isSupported() {
        return true; // Native lib is supported in app
    }
}

export default new BluetoothService();

import { Platform, PermissionsAndroid, NativeModules, NativeEventEmitter } from 'react-native';
import { Buffer } from 'buffer';
import EscPosEncoder from 'esc-pos-encoder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const STORED_DEVICE_KEY = '@bluetooth_printer_device';

class BluetoothService {
    constructor() {
        this.device = null;
        this.isBluetoothEnabled = false;
        this.isDiscovering = false;
        this.discoverySubscription = null;
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

    /**
     * Check if Bluetooth is enabled
     */
    async isBluetoothAvailable() {
        try {
            return await RNBluetoothClassic.isBluetoothEnabled();
        } catch (error) {
            console.error('Bluetooth check error:', error);
            return false;
        }
    }

    /**
     * Get list of paired/bonded devices
     * Bluetooth Classic requires devices to be paired first via Android Settings
     */
    async getBondedDevices() {
        try {
            const bonded = await RNBluetoothClassic.getBondedDevices();
            return bonded || [];
        } catch (error) {
            console.error('Get bonded devices error:', error);
            return [];
        }
    }

    /**
     * Scan for paired devices only
     * @param {Function} onDeviceFound - Callback when device found
     */
    async scanPairedDevices(onDeviceFound) {
        try {
            const isEnabled = await this.isBluetoothAvailable();
            if (!isEnabled) {
                console.warn('Bluetooth is not enabled');
                return;
            }

            const bondedDevices = await this.getBondedDevices();
            bondedDevices.forEach(device => {
                if (device.name) {
                    onDeviceFound({
                        id: device.address || device.id,
                        name: device.name,
                        address: device.address || device.id,
                        bonded: true,
                    });
                }
            });
        } catch (error) {
            console.error('Scan paired error:', error);
        }
    }

    /**
     * Start discovery untuk mencari perangkat baru (belum paired)
     * @param {Function} onDeviceFound - Callback when device found
     */
    async startDiscovery(onDeviceFound) {
        try {
            const isEnabled = await this.isBluetoothAvailable();
            if (!isEnabled) {
                console.warn('Bluetooth is not enabled');
                return false;
            }

            this.isDiscovering = true;

            // Listen for discovered devices
            this.discoverySubscription = RNBluetoothClassic.onDeviceDiscovered((device) => {
                if (device && device.name) {
                    onDeviceFound({
                        id: device.address || device.id,
                        name: device.name,
                        address: device.address || device.id,
                        bonded: device.bonded || false,
                    });
                }
            });

            // Start the discovery process
            await RNBluetoothClassic.startDiscovery();
            return true;
        } catch (error) {
            console.error('Discovery error:', error);
            this.isDiscovering = false;
            return false;
        }
    }

    /**
     * Stop discovery
     */
    async cancelDiscovery() {
        try {
            if (this.discoverySubscription) {
                this.discoverySubscription.remove();
                this.discoverySubscription = null;
            }
            await RNBluetoothClassic.cancelDiscovery();
            this.isDiscovering = false;
        } catch (error) {
            console.error('Cancel discovery error:', error);
        }
    }

    /**
     * Scan untuk semua perangkat (paired + discovery new devices)
     * @param {Function} onDeviceFound - Callback when device found
     */
    async scanDevices(onDeviceFound) {
        // First, get paired devices
        await this.scanPairedDevices(onDeviceFound);

        // Then start discovery for new devices
        await this.startDiscovery(onDeviceFound);
    }

    /**
     * Stop scan and discovery
     */
    async stopScan() {
        await this.cancelDiscovery();
    }

    /**
     * Pair dengan perangkat baru
     * @param {string} deviceAddress - MAC address perangkat
     * @returns {boolean} - true jika berhasil paired
     */
    async pairDevice(deviceAddress) {
        try {
            await this.cancelDiscovery();
            const paired = await RNBluetoothClassic.pairDevice(deviceAddress);
            return paired;
        } catch (error) {
            console.error('Pair error:', error);
            throw error;
        }
    }

    /**
     * Unpair perangkat
     * @param {string} deviceAddress - MAC address perangkat
     */
    async unpairDevice(deviceAddress) {
        try {
            await RNBluetoothClassic.unpairDevice(deviceAddress);
            return true;
        } catch (error) {
            console.error('Unpair error:', error);
            return false;
        }
    }

    async connectToDevice(deviceAddress) {
        try {
            console.log(`Connecting to ${deviceAddress}...`);

            // Connect to device
            const device = await RNBluetoothClassic.connectToDevice(deviceAddress);

            if (device) {
                this.device = device;
                console.log('Connected to:', device.name);

                // Store device for later retrieval
                await this.storeDevice({
                    id: device.address || deviceAddress,
                    name: device.name,
                    address: device.address || deviceAddress,
                });

                return device;
            }
            throw new Error('Failed to connect to device');
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.device) {
            try {
                await RNBluetoothClassic.disconnectFromDevice(this.device.address || this.device.id);
                this.device = null;
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
                id: device.address || device.id,
                name: device.name,
                address: device.address || device.id,
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
                    id: this.device.address || this.device.id,
                    name: this.device.name,
                    address: this.device.address || this.device.id,
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

    /**
     * Reconnect to stored device
     */
    async reconnectToStoredDevice() {
        try {
            const storedDevice = await this.getStoredDevice();
            if (storedDevice && storedDevice.address) {
                return await this.connectToDevice(storedDevice.address);
            }
            return null;
        } catch (error) {
            console.error('Reconnect error:', error);
            return null;
        }
    }

    async sendData(data) {
        const deviceAddress = this.device?.address || this.device?.id;

        // Step 1: Check if we have device info
        if (!this.device || !deviceAddress) {
            console.log('No device info, attempting to reconnect...');
            const reconnected = await this.reconnectToStoredDevice();
            if (!reconnected) {
                throw new Error('Printer tidak terhubung. Silakan hubungkan printer terlebih dahulu.');
            }
        }

        // Step 2: Verify actual connection status (not just state)
        try {
            const actuallyConnected = await RNBluetoothClassic.isDeviceConnected(deviceAddress);
            if (!actuallyConnected) {
                console.log('Device not actually connected, reconnecting...');
                await this.connectToDevice(deviceAddress);
            }
        } catch (connError) {
            console.log('Connection check failed, reconnecting...', connError.message);
            await this.connectToDevice(deviceAddress);
        }

        // Step 3: Send data with retry mechanism
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Send attempt ${attempt}/${maxRetries}...`);

                // Convert Uint8Array to Base64 string for sending
                const base64Data = Buffer.from(data).toString('base64');

                // Send data in chunks for reliability (512 bytes per chunk)
                const chunkSize = 512;
                const totalChunks = Math.ceil(base64Data.length / chunkSize);

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
                    await RNBluetoothClassic.writeToDevice(
                        deviceAddress,
                        chunk,
                        'base64'
                    );
                    // Small delay between chunks for printer buffer
                    if (i < totalChunks - 1) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }

                console.log('Data sent successfully');
                return; // Success, exit
            } catch (error) {
                lastError = error;
                console.error(`Send attempt ${attempt} failed:`, error.message);

                if (attempt < maxRetries) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Try to reconnect before retrying
                    try {
                        await this.connectToDevice(deviceAddress);
                    } catch (reconnectError) {
                        console.error('Reconnect failed:', reconnectError.message);
                    }
                }
            }
        }

        // All retries failed
        throw new Error(`Gagal mengirim data setelah ${maxRetries} percobaan: ${lastError?.message || 'Unknown error'}`);
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

        // Helper function to wrap text for ESC/POS (32 char width)
        const wrapText = (text, maxWidth = 32, indent = 0) => {
            if (!text) return ['-'];
            const lines = [];
            const paragraphs = text.split('\n');
            const indentStr = ' '.repeat(indent);
            const effectiveWidth = maxWidth - indent;

            paragraphs.forEach(paragraph => {
                const words = paragraph.split(' ');
                let currentLine = '';

                words.forEach(word => {
                    if ((currentLine + ' ' + word).trim().length <= effectiveWidth) {
                        currentLine = (currentLine + ' ' + word).trim();
                    } else {
                        if (currentLine) lines.push(indentStr + currentLine);
                        currentLine = word;
                    }
                });
                if (currentLine) lines.push(indentStr + currentLine);
            });

            return lines.length > 0 ? lines : ['-'];
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
            .line(`Imei     : ${imei || '-'}`);

        // Handle multiline kerusakan with wrapping
        const kerusakanLines = wrapText(damageDescription, 32, 11); // 11 = length of "Kerusakan: "
        result.line(`Kerusakan: ${kerusakanLines[0].trim()}`);
        kerusakanLines.slice(1).forEach(line => {
            result.line(line);
        });

        result
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
        return Platform.OS === 'android'; // Bluetooth Classic mainly supported on Android
    }
}

export default new BluetoothService();

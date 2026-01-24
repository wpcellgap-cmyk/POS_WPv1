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
     * Check if device is actually connected (real-time check)
     * @returns {Promise<boolean>}
     */
    async isReallyConnected() {
        if (!this.device) return false;
        try {
            const deviceAddress = this.device.address || this.device.id;
            return await RNBluetoothClassic.isDeviceConnected(deviceAddress);
        } catch (error) {
            console.error('Connection check error:', error);
            return false;
        }
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
        const currentAddress = this.device?.address || this.device?.id;
        try {
            const actuallyConnected = await RNBluetoothClassic.isDeviceConnected(currentAddress);
            if (!actuallyConnected) {
                console.log('Device not actually connected, reconnecting...');
                await this.connectToDevice(currentAddress);
            }
        } catch (connError) {
            console.log('Connection check failed, reconnecting...', connError.message);
            await this.connectToDevice(currentAddress);
        }

        // Step 3: Send data with retry mechanism
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Send attempt ${attempt}/${maxRetries}...`);
                console.log(`Data length: ${data.length} bytes`);

                // FIX: Chunk RAW BYTES first, then encode each chunk to base64
                // This prevents corruption from splitting base64 string incorrectly
                const rawChunkSize = 256; // Smaller chunks for thermal printer stability
                const totalChunks = Math.ceil(data.length / rawChunkSize);

                console.log(`Sending ${totalChunks} chunks of ${rawChunkSize} bytes each...`);

                for (let i = 0; i < totalChunks; i++) {
                    // Slice raw bytes
                    const start = i * rawChunkSize;
                    const end = Math.min(start + rawChunkSize, data.length);
                    const chunk = data.slice(start, end);

                    // Convert this chunk to base64
                    const base64Chunk = Buffer.from(chunk).toString('base64');

                    // Send to printer
                    await RNBluetoothClassic.writeToDevice(
                        currentAddress,
                        base64Chunk,
                        'base64'
                    );

                    // Delay between chunks for printer buffer (increased for stability)
                    if (i < totalChunks - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
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
                        await this.connectToDevice(currentAddress);
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

        // ESC/POS Commands
        const ESC = 0x1B;
        const GS = 0x1D;
        const LF = 0x0A;  // Line Feed

        // Build raw command bytes
        const commands = [];

        // Initialize printer
        commands.push(ESC, 0x40);  // ESC @ - Initialize

        // Select character code table (CP437 or PC437 USA)
        commands.push(ESC, 0x74, 0x00);  // ESC t 0 - Select CP437

        // Helper function to add text with line feed
        const addLine = (text) => {
            const bytes = [];
            for (let i = 0; i < text.length; i++) {
                bytes.push(text.charCodeAt(i) & 0xFF);
            }
            bytes.push(LF);  // Line Feed
            commands.push(...bytes);
        };

        // Helper function to center text
        const addCentered = (text) => {
            commands.push(ESC, 0x61, 0x01);  // ESC a 1 - Center align
            addLine(text);
        };

        // Helper function to left align text
        const addLeft = (text) => {
            commands.push(ESC, 0x61, 0x00);  // ESC a 0 - Left align
            addLine(text);
        };

        // Helper function to add bold text
        const addBoldCentered = (text) => {
            commands.push(ESC, 0x45, 0x01);  // ESC E 1 - Bold ON
            addCentered(text);
            commands.push(ESC, 0x45, 0x00);  // ESC E 0 - Bold OFF
        };

        const addBoldLeft = (text) => {
            commands.push(ESC, 0x45, 0x01);  // ESC E 1 - Bold ON
            addLeft(text);
            commands.push(ESC, 0x45, 0x00);  // ESC E 0 - Bold OFF
        };

        // Helper for double-size text (header)
        const addDoubleSize = (text) => {
            commands.push(ESC, 0x61, 0x01);  // Center align
            commands.push(GS, 0x21, 0x11);   // GS ! 17 - Double height + Double width
            addLine(text);
            commands.push(GS, 0x21, 0x00);   // GS ! 0 - Reset to normal size
        };

        // Helper for small font (Font B)
        const addSmallCentered = (text) => {
            commands.push(ESC, 0x61, 0x01);  // Center align
            commands.push(ESC, 0x21, 0x01);  // ESC ! 1 - Select Font B (small)
            addLine(text);
            commands.push(ESC, 0x21, 0x00);  // ESC ! 0 - Reset to Font A (normal)
        };

        // Helper to wrap long text by word
        const wrapText = (text, maxWidth = 32) => {
            if (!text) return ['-'];
            const lines = [];
            const words = text.replace(/\n/g, ' ').split(' ').filter(w => w.length > 0);
            let currentLine = '';

            words.forEach(word => {
                if (currentLine.length === 0) {
                    currentLine = word;
                } else if ((currentLine + ' ' + word).length <= maxWidth) {
                    currentLine = currentLine + ' ' + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            });
            if (currentLine) lines.push(currentLine);
            return lines.length > 0 ? lines : ['-'];
        };

        // ===== BUILD RECEIPT =====

        // Header - Double size store name
        addDoubleSize(storeName);
        commands.push(LF);  // Extra spacing after store name

        addCentered(storeTagline);
        if (storeAddress) addCentered(storeAddress);
        if (storePhone) addCentered(`WA: ${storePhone}`);
        addCentered('********************************');

        // Date and Service Number
        addLeft(`${dateObj.toLocaleDateString('id-ID')}   ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        addLeft(`No Service : ${serviceNumber}`);
        addCentered('********************************');

        // Customer Section
        addBoldCentered('* Customer *');
        addLeft(`Nama     : ${customerName}`);
        addLeft(`Nomor HP : ${customerPhone || '-'}`);
        addLeft('--------------------------------');

        // Device Info
        addLeft(`Merk HP  : ${phoneBrand}`);
        addLeft(`Type HP  : ${phoneType || '-'}`);
        addLeft(`Imei     : ${imei || '-'}`);

        // Kerusakan (with wrap)
        const kerusakanLines = wrapText(damageDescription, 21);  // 32 - 11 (label length)
        addLeft(`Kerusakan: ${kerusakanLines[0]}`);
        kerusakanLines.slice(1).forEach(line => {
            addLeft(`           ${line}`);
        });

        addLeft('--------------------------------');

        // Cost and Warranty
        addBoldLeft(`Biaya    : Rp ${(cost || 0).toLocaleString('id-ID')}`);
        addLeft(`Garansi  : ${warranty}`);
        addCentered('********************************');

        // Footer - Small font with word-wrap
        const footerLine1 = 'Terima Kasih Atas Kepercayaan Anda';
        const footerLine2 = 'Kepuasan Konsumen Adalah Prioritas Kami';

        // For small font (Font B), width is ~42 chars on 58mm paper
        const footerWrap1 = wrapText(footerLine1, 42);
        const footerWrap2 = wrapText(footerLine2, 42);

        footerWrap1.forEach(line => addSmallCentered(line));
        footerWrap2.forEach(line => addSmallCentered(line));

        // Feed paper (3 lines for easy tear)
        commands.push(LF, LF, LF);

        // Partial cut (if supported) - GS V 1
        commands.push(GS, 0x56, 0x01);

        // Convert to Uint8Array
        const data = new Uint8Array(commands);

        console.log(`Sending ${data.length} bytes to printer...`);
        await this.sendData(data);
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

        // ESC/POS Commands
        const ESC = 0x1B;
        const GS = 0x1D;
        const LF = 0x0A;

        const commands = [];

        // Initialize printer
        commands.push(ESC, 0x40);  // ESC @ - Initialize
        commands.push(ESC, 0x74, 0x00);  // ESC t 0 - Select CP437

        // Helper functions
        const addLine = (text) => {
            for (let i = 0; i < text.length; i++) {
                commands.push(text.charCodeAt(i) & 0xFF);
            }
            commands.push(LF);
        };

        const addCentered = (text) => {
            commands.push(ESC, 0x61, 0x01);
            addLine(text);
        };

        const addLeft = (text) => {
            commands.push(ESC, 0x61, 0x00);
            addLine(text);
        };

        const addBoldCentered = (text) => {
            commands.push(ESC, 0x45, 0x01);
            addCentered(text);
            commands.push(ESC, 0x45, 0x00);
        };

        const addBoldLeft = (text) => {
            commands.push(ESC, 0x45, 0x01);
            addLeft(text);
            commands.push(ESC, 0x45, 0x00);
        };

        // Helper for double-size text (header)
        const addDoubleSize = (text) => {
            commands.push(ESC, 0x61, 0x01);  // Center align
            commands.push(GS, 0x21, 0x11);   // GS ! 17 - Double height + Double width
            addLine(text);
            commands.push(GS, 0x21, 0x00);   // GS ! 0 - Reset to normal size
        };

        // Helper for small font (Font B)
        const addSmallCentered = (text) => {
            commands.push(ESC, 0x61, 0x01);  // Center align
            commands.push(ESC, 0x21, 0x01);  // ESC ! 1 - Select Font B (small)
            addLine(text);
            commands.push(ESC, 0x21, 0x00);  // ESC ! 0 - Reset to Font A (normal)
        };

        // ===== BUILD RECEIPT =====

        // Header - Double size store name
        addDoubleSize(storeName);
        commands.push(LF);  // Extra spacing after store name

        addCentered(storeTagline);
        if (storeAddress) addCentered(storeAddress);
        if (storePhone) addCentered(`WA: ${storePhone}`);
        addLeft('--------------------------------');

        // Date/Time
        addLeft(`Tgl: ${date.toLocaleDateString('id-ID')}`);
        addLeft(`Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        addLeft('--------------------------------');

        // Items
        transactionData.items?.forEach(item => {
            addLeft(item.name);
            const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`;
            const subtotal = (item.subtotal || (item.price * item.qty)).toLocaleString('id-ID');
            const spaces = 32 - qtyPrice.length - subtotal.length;
            addLeft(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
        });

        const pm = getPaymentLabel(transactionData.paymentMethod);

        addLeft('--------------------------------');

        // Total
        const totalStr = `Rp ${transactionData.total.toLocaleString('id-ID')}`;
        const totalSpaces = 32 - 5 - totalStr.length;
        addBoldLeft('TOTAL' + ' '.repeat(Math.max(1, totalSpaces)) + totalStr);

        addLeft(`Bayar (${pm}): ${(transactionData.amountPaid || 0).toLocaleString('id-ID')}`);
        addLeft(`Kembalian: ${(transactionData.change || 0).toLocaleString('id-ID')}`);
        addLeft('--------------------------------');

        // Footer - Small font
        addSmallCentered('Terima Kasih');
        addSmallCentered(`Sudah Belanja di ${storeName}`);

        // Feed paper (3 lines for easy tear)
        commands.push(LF, LF, LF);

        // Partial cut
        commands.push(GS, 0x56, 0x01);

        const data = new Uint8Array(commands);
        console.log(`Sending ${data.length} bytes to printer...`);
        await this.sendData(data);
    }

    isSupported() {
        return Platform.OS === 'android'; // Bluetooth Classic mainly supported on Android
    }
}

export default new BluetoothService();

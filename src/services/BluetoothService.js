/**
 * BluetoothService.js
 * direct Web Bluetooth API Integration for Thermal Printers (58mm)
 * Supports Multi-UUID, Data Chunking (20 bytes / 20ms delay), and ESC/POS encoding.
 */

class BluetoothService {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.connected = false;

        // Common Service UUIDs for Thermal Printers
        this.serviceUUIDs = [
            '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial/POS
            '0000ae30-0000-1000-8000-00805f9b34fb', // Panda / Goojprt
            '0000e001-0000-1000-8000-00805f9b34fb', // Epson
            '0000ff00-0000-1000-8000-00805f9b34fb', // RPP
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Some other models
        ];

        // Characteristic UUIDs to look for (Write without response or Write)
        this.characteristicUUIDs = [
            '00002af1-0000-1000-8000-00805f9b34fb',
            '0000ae01-0000-1000-8000-00805f9b34fb',
            '0000be02-0000-1000-8000-00805f9b34fb',
            '49535343-8841-43f4-a8d4-ecbe34729bb3'
        ];
    }

    isSupported() {
        return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    }

    async connect() {
        if (!this.isSupported()) {
            throw new Error('Browser Anda tidak mendukung Web Bluetooth API.');
        }

        try {
            console.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: this.serviceUUIDs },
                    { namePrefix: 'Printer' },
                    { namePrefix: 'MP' },
                    { namePrefix: 'RPP' }
                ],
                optionalServices: this.serviceUUIDs
            });

            console.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            // Find primary service and characteristic
            for (const uuid of this.serviceUUIDs) {
                try {
                    this.service = await this.server.getPrimaryService(uuid);
                    if (this.service) break;
                } catch (e) {
                    continue;
                }
            }

            if (!this.service) {
                throw new Error('Service Printer tidak ditemukan.');
            }

            // Find characteristic for writing
            const characteristics = await this.service.getCharacteristics();
            this.characteristic = characteristics.find(c => 
                c.properties.write || c.properties.writeWithoutResponse
            );

            if (!this.characteristic) {
                throw new Error('Write characteristic tidak ditemukan.');
            }

            this.connected = true;
            console.log('Printer Connected Successfully');
            
            this.device.addEventListener('gattserverdisconnected', () => {
                this.connected = false;
                console.log('Printer Disconnected');
            });

            return this.device;
        } catch (error) {
            console.error('Connection Failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.connected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
    }

    async sendDataInChunks(data) {
        if (!this.characteristic || !this.connected) {
            throw new Error('Printer tidak terhubung.');
        }

        const CHUNK_SIZE = 20;
        const DELAY_MS = 20;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await this.characteristic.writeValue(chunk);
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
}

export default new BluetoothService();

import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';

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
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        }
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

    isSupported() {
        return true; // Native lib is supported in app
    }
}

export default new BluetoothService();

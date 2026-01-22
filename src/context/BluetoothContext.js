import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import BluetoothService from '../services/BluetoothService';

const BluetoothContext = createContext();

export const useBluetooth = () => useContext(BluetoothContext);

export const BluetoothProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [device, setDevice] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [scannedDevices, setScannedDevices] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const isScanningRef = useRef(false);

    useEffect(() => {
        const checkConnection = async () => {
            const storedDevice = await BluetoothService.getStoredDevice();
            if (storedDevice) {
                setDevice(storedDevice);
                try {
                    await BluetoothService.connectToDevice(storedDevice.address || storedDevice.id);
                    setIsConnected(true);
                } catch (error) {
                    console.log('Auto-reconnect failed:', error.message);
                }
            }
        };
        checkConnection();

        return () => {
            BluetoothService.disconnect();
            BluetoothService.stopScan();
        };
    }, []);

    useEffect(() => {
        isScanningRef.current = isScanning;
    }, [isScanning]);

    const startScan = async () => {
        const hasPermission = await BluetoothService.requestPermissions();
        if (!hasPermission) {
            console.warn('Bluetooth permissions not granted');
            return;
        }

        const isEnabled = await BluetoothService.isBluetoothAvailable();
        if (!isEnabled) {
            console.warn('Bluetooth is not enabled');
            return;
        }

        setScannedDevices([]);
        setIsScanning(true);

        // Scan paired + discover new devices
        await BluetoothService.scanDevices((newDevice) => {
            setScannedDevices((prevDevices) => {
                const exists = prevDevices.find(d => d.id === newDevice.id);
                if (exists) return prevDevices;
                return [...prevDevices, newDevice];
            });
        });

        // Auto stop after 15 seconds
        setTimeout(() => {
            if (isScanningRef.current) stopScan();
        }, 15000);
    };

    const stopScan = async () => {
        await BluetoothService.stopScan();
        setIsScanning(false);
    };

    /**
     * Pair dengan device baru
     */
    const pairDevice = async (deviceAddress) => {
        try {
            const paired = await BluetoothService.pairDevice(deviceAddress);
            if (paired) {
                // Update device list to mark as bonded
                setScannedDevices((prev) =>
                    prev.map(d =>
                        d.address === deviceAddress ? { ...d, bonded: true } : d
                    )
                );
            }
            return paired;
        } catch (error) {
            console.error('Pairing failed:', error);
            return false;
        }
    };

    const connect = async (deviceId) => {
        setIsConnecting(true);
        await stopScan();
        try {
            const connectedDevice = await BluetoothService.connectToDevice(deviceId);
            setDevice(connectedDevice);
            setIsConnected(true);
            return true;
        } catch (error) {
            console.error('Context Connection Error:', error);
            setIsConnected(false);
            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = async () => {
        try {
            await BluetoothService.disconnect();
            setIsConnected(false);
            setDevice(null);
            return true;
        } catch (error) {
            console.error('Context Disconnection Error:', error);
            return false;
        }
    };

    return (
        <BluetoothContext.Provider value={{
            isConnected,
            device,
            isConnecting,
            isScanning,
            scannedDevices,
            startScan,
            stopScan,
            pairDevice,
            connect,
            disconnect,
            isSupported: BluetoothService.isSupported()
        }}>
            {children}
        </BluetoothContext.Provider>
    );
};

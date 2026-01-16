import React, { createContext, useContext, useState, useEffect } from 'react';
import BluetoothService from '../services/BluetoothService';

const BluetoothContext = createContext();

export const useBluetooth = () => useContext(BluetoothContext);

export const BluetoothProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [device, setDevice] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [scannedDevices, setScannedDevices] = useState([]);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const checkConnection = async () => {
            // Optional: Check if already connected (rehydration)
        };
        checkConnection();

        return () => {
            BluetoothService.disconnect();
        };
    }, []);

    const startScan = async () => {
        const hasPermission = await BluetoothService.requestPermissions();
        if (!hasPermission) {
            console.warn('Bluetooth permissions not granted');
            return;
        }

        setScannedDevices([]);
        setIsScanning(true);

        BluetoothService.scanDevices((newDevice) => {
            setScannedDevices((prevDevices) => {
                const exists = prevDevices.find(d => d.id === newDevice.id);
                if (exists) return prevDevices;
                return [...prevDevices, newDevice];
            });
        });

        // Auto stop scan after 10 seconds
        setTimeout(() => {
            if (isScanning) stopScan();
        }, 10000);
    };

    const stopScan = () => {
        BluetoothService.stopScan();
        setIsScanning(false);
    };

    const connect = async (deviceId) => {
        setIsConnecting(true);
        stopScan(); // Stop scanning before connecting
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
            connect,
            disconnect,
            isSupported: BluetoothService.isSupported()
        }}>
            {children}
        </BluetoothContext.Provider>
    );
};

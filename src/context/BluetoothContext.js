import React, { createContext, useContext, useState, useEffect } from 'react';
import BluetoothService from '../services/BluetoothService';

const BluetoothContext = createContext();

export const useBluetooth = () => useContext(BluetoothContext);

export const BluetoothProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [device, setDevice] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Handle unexpected disconnections
        const handleDisconnect = () => {
            setIsConnected(false);
            setDevice(null);
        };

        if (device) {
            device.addEventListener('gattserverdisconnected', handleDisconnect);
        }

        return () => {
            if (device) {
                device.removeEventListener('gattserverdisconnected', handleDisconnect);
            }
        };
    }, [device]);

    const connect = async () => {
        setIsConnecting(true);
        try {
            const connectedDevice = await BluetoothService.connect();
            setDevice(connectedDevice);
            setIsConnected(true);
            return true;
        } catch (error) {
            console.error('Context Connection Error:', error);
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
            connect,
            disconnect,
            isSupported: BluetoothService.isSupported()
        }}>
            {children}
        </BluetoothContext.Provider>
    );
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultTheme } from '../constants/theme';

const ThemeContext = createContext();

export const THEME_COLORS = {
    blue: '#1E88E5',
    green: '#10B981',
    purple: '#8B5CF6',
    orange: '#F59E0B',
    red: '#EF4444',
};

export const ThemeProvider = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState(defaultTheme.colors.primary);
    const [themeId, setThemeId] = useState('blue');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedThemeId = await AsyncStorage.getItem('app_theme_id');
            if (savedThemeId && THEME_COLORS[savedThemeId]) {
                setThemeId(savedThemeId);
                setPrimaryColor(THEME_COLORS[savedThemeId]);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const updateTheme = async (newThemeId) => {
        if (THEME_COLORS[newThemeId]) {
            try {
                await AsyncStorage.setItem('app_theme_id', newThemeId);
                setThemeId(newThemeId);
                setPrimaryColor(THEME_COLORS[newThemeId]);
            } catch (error) {
                console.error('Error saving theme:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ primaryColor, themeId, updateTheme, colors: THEME_COLORS }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

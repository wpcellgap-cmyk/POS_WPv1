import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';

const ThemeContext = createContext();

export const THEME_COLORS = {
    blue: '#1E88E5',
    green: '#10B981',
    purple: '#8B5CF6',
    orange: '#F59E0B',
    red: '#EF4444',
};

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [primaryColor, setPrimaryColor] = useState(lightColors.primary);
    const [themeId, setThemeId] = useState('blue');
    const [isDark, setIsDark] = useState(false);
    const [themeColors, setThemeColors] = useState(lightColors);

    useEffect(() => {
        loadTheme();
    }, []);

    useEffect(() => {
        // Update colors when dark mode changes
        const baseColors = isDark ? darkColors : lightColors;
        setThemeColors({
            ...baseColors,
            primary: primaryColor,
            primaryDark: isDark
                ? adjustColor(primaryColor, -20)
                : adjustColor(primaryColor, -30),
        });
    }, [isDark, primaryColor]);

    // Helper function to darken/lighten color
    const adjustColor = (color, amount) => {
        const clamp = (val) => Math.min(255, Math.max(0, val));
        const hex = color.replace('#', '');
        const r = clamp(parseInt(hex.slice(0, 2), 16) + amount);
        const g = clamp(parseInt(hex.slice(2, 4), 16) + amount);
        const b = clamp(parseInt(hex.slice(4, 6), 16) + amount);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const loadTheme = async () => {
        try {
            const savedThemeId = await AsyncStorage.getItem('app_theme_id');
            const savedDarkMode = await AsyncStorage.getItem('app_dark_mode');

            if (savedThemeId && THEME_COLORS[savedThemeId]) {
                setThemeId(savedThemeId);
                setPrimaryColor(THEME_COLORS[savedThemeId]);
            }

            if (savedDarkMode !== null) {
                setIsDark(savedDarkMode === 'true');
            } else {
                // Use system preference if no saved preference
                setIsDark(systemColorScheme === 'dark');
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

    const toggleDarkMode = async (value) => {
        try {
            const newValue = value !== undefined ? value : !isDark;
            await AsyncStorage.setItem('app_dark_mode', String(newValue));
            setIsDark(newValue);
        } catch (error) {
            console.error('Error saving dark mode:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{
            primaryColor,
            themeId,
            updateTheme,
            colors: THEME_COLORS,
            isDark,
            toggleDarkMode,
            themeColors,
        }}>
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

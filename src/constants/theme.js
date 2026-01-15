import { colors } from './colors';

export const theme = {
    colors,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
        // Aliases for backward compatibility
        s: 8,
        m: 16,
        l: 24,
    },
    typography: {
        h1: { fontSize: 28, fontWeight: 'bold', color: colors.text },
        h2: { fontSize: 24, fontWeight: 'bold', color: colors.text },
        subtitle: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
        body: { fontSize: 14, color: colors.text },
        caption: { fontSize: 12, color: colors.textSecondary },
        button: { fontSize: 16, fontWeight: '600', color: colors.white },
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 25,
        // Aliases for backward compatibility
        s: 4,
        m: 8,
        l: 12,
    },
    shadow: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
    },
    headerShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    }
};

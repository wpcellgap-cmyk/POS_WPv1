import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const RECEIPT_WIDTH = 30; // Reduced from 32 to prevent wrapping

const SalesReceiptTemplate = ({ transactionData, storeSettings }) => {
    const {
        items = [],
        total = 0,
        paymentMethod = 'cash',
        amountPaid = 0,
        change = 0,
        createdAt,
    } = transactionData || {};

    const {
        storeName = 'WP CELL',
        storeTagline = 'Service HP Software & Hardware',
        storeAddress = 'Jln Kawi NO 121 Jenggawah',
        storePhone = '082333912221',
    } = storeSettings || {};

    const formatDate = (d) => {
        if (!d) return '';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (d) => {
        if (!d) return '';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return (amount || 0).toLocaleString('id-ID');
    };

    const centerText = (text, width = RECEIPT_WIDTH) => {
        if (text.length >= width) return text.substring(0, width);
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text;
    };

    const leftRightText = (left, right, width = RECEIPT_WIDTH) => {
        const space = width - left.toString().length - right.toString().length;
        return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const dividerEqual = '='.repeat(RECEIPT_WIDTH);
    const dividerDash = '-'.repeat(RECEIPT_WIDTH);

    const getPaymentMethodLabel = (method) => {
        const labels = {
            cash: 'Tunai',
            transfer: 'Transfer',
            qris: 'QRIS'
        };
        return labels[method] || method;
    };

    return (
        <View style={styles.receiptContainer}>
            <View style={styles.receipt}>
                {/* Header */}
                <Text style={[styles.line, styles.bold]}>{centerText(storeName)}</Text>
                <Text style={styles.line}>{centerText(storeTagline)}</Text>
                <Text style={styles.line}>{centerText(storeAddress)}</Text>
                <Text style={styles.line}>{centerText('WA: ' + storePhone)}</Text>
                <Text style={styles.line}>{dividerDash}</Text>

                {/* Date & Time */}
                <Text style={styles.line}>
                    {leftRightText(formatDate(createdAt), formatTime(createdAt))}
                </Text>
                <Text style={styles.line}>{dividerDash}</Text>

                {/* Items */}
                {items.map((item, index) => (
                    <View key={index}>
                        <Text style={styles.line}>{item.name}</Text>
                        <Text style={styles.line}>
                            {leftRightText(`${item.qty} x ${formatCurrency(item.price)}`, formatCurrency(item.subtotal))}
                        </Text>
                    </View>
                ))}
                <Text style={styles.line}>{dividerDash}</Text>

                {/* Totals */}
                <Text style={[styles.line, styles.bold]}>
                    {leftRightText('TOTAL', 'Rp ' + formatCurrency(total))}
                </Text>
                <Text style={styles.line}>
                    {leftRightText('Bayar (' + getPaymentMethodLabel(paymentMethod) + ')', formatCurrency(amountPaid))}
                </Text>
                <Text style={styles.line}>
                    {leftRightText('Kembalian', formatCurrency(change))}
                </Text>
                <Text style={styles.line}>{dividerDash}</Text>

                {/* Footer */}
                <Text style={styles.footerLine}>Terima Kasih</Text>
                <Text style={styles.footerLine}>Sudah Belanja di {storeName}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    receiptContainer: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    receipt: {
        backgroundColor: '#FFFEF0',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
        maxWidth: 260, // Better represents ~54mm on mobile screens
    },
    line: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 18,
        color: '#333',
    },
    bold: {
        fontWeight: 'bold',
    },
    footerLine: {
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 14,
        color: '#333',
        textAlign: 'center',
        marginTop: 2,
    },
});

export default SalesReceiptTemplate;

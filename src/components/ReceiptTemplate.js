import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const RECEIPT_WIDTH = 30; // Reduced from 32 to prevent wrapping on 58mm mobile UI

const ReceiptTemplate = ({ serviceData, storeSettings }) => {
    const {
        serviceNumber = 'SVC-000001',
        customerName = '',
        customerPhone = '',
        phoneBrand = '',
        phoneType = '',
        imei = '',
        damageDescription = '',
        cost = '',
        warranty = '-',
        date = new Date(),
    } = serviceData || {};

    const {
        storeName = 'WP CELL',
        storeTagline = 'Service HP Software & Hardware',
        storeAddress = 'Jln Kawi NO 121 Jenggawah',
        storePhone = '082333912221',
    } = storeSettings || {};

    const formatDate = (d) => {
        const date = d instanceof Date ? d : new Date(d);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (d) => {
        const date = d instanceof Date ? d : new Date(d);
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return (amount || 0).toLocaleString('id-ID');
    };

    const centerText = (text, width = RECEIPT_WIDTH) => {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    };

    const leftRightText = (left, right, width = RECEIPT_WIDTH) => {
        const space = width - left.length - right.length;
        return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const labelValue = (label, value, labelWidth = 11) => {
        const paddedLabel = (label + ' ').padEnd(labelWidth, ' ');
        return paddedLabel + ': ' + (value || '-');
    };

    // Function to wrap long text for kerusakan field
    const wrapKerusakan = (text, maxWidth = RECEIPT_WIDTH - 13) => {
        if (!text) return ['-'];
        const lines = [];
        const paragraphs = text.split('\n');

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let currentLine = '';

            words.forEach(word => {
                if ((currentLine + ' ' + word).trim().length <= maxWidth) {
                    currentLine = (currentLine + ' ' + word).trim();
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            });
            if (currentLine) lines.push(currentLine);
        });

        return lines.length > 0 ? lines : ['-'];
    };

    const dividerStar = '*'.repeat(RECEIPT_WIDTH);
    const dividerDash = '-'.repeat(RECEIPT_WIDTH);
    const dividerEqual = '='.repeat(RECEIPT_WIDTH);

    const kerusakanLines = wrapKerusakan(damageDescription);

    return (
        <View style={styles.receiptContainer}>
            <View style={styles.receipt}>
                {/* Header */}
                <Text style={[styles.line, styles.bold]}>{centerText(storeName)}</Text>
                <Text style={styles.line}>{centerText(storeTagline)}</Text>
                <Text style={styles.line}>{centerText(storeAddress)}</Text>
                <Text style={styles.line}>{centerText('WA : ' + storePhone)}</Text>

                {/* Date & Time */}
                <Text style={styles.line}>
                    {leftRightText(formatDate(date), formatTime(date))}
                </Text>
                <Text style={styles.line}>No Service : {serviceNumber}</Text>
                <Text style={styles.line}>{dividerStar}</Text>

                {/* Customer Section */}
                <Text style={[styles.line, styles.bold]}>{centerText('* Customer *')}</Text>
                <Text style={styles.line}>{labelValue('Nama', customerName)}</Text>
                <Text style={styles.line}>{labelValue('Nomor HP', customerPhone)}</Text>
                <Text style={styles.line}>{dividerDash}</Text>

                {/* Device Section */}
                <Text style={styles.line}>{labelValue('Merk HP', phoneBrand)}</Text>
                <Text style={styles.line}>{labelValue('Type HP', phoneType)}</Text>
                <Text style={styles.line}>{labelValue('Imei', imei)}</Text>

                {/* Kerusakan with wrapping support */}
                <Text style={styles.line}>{'Kerusakan  : ' + kerusakanLines[0]}</Text>
                {kerusakanLines.slice(1).map((line, index) => (
                    <Text key={index} style={styles.lineWrapped}>{'             ' + line}</Text>
                ))}

                <Text style={styles.line}>{dividerDash}</Text>

                {/* Cost Section */}
                <Text style={[styles.line, styles.bold]}>
                    {labelValue('Biaya', 'Rp ' + formatCurrency(cost))}
                </Text>
                <Text style={styles.line}>{labelValue('Garansi', warranty)}</Text>
                <Text style={styles.line}>{dividerStar}</Text>

                {/* Footer */}
                <Text style={styles.footerLine}>Terima Kasih Atas Kepercayaan Anda</Text>
                <Text style={styles.footerLine}>Kepuasan Konsumen Adalah Prioritas Kami</Text>
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
    lineWrapped: {
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

export default ReceiptTemplate;

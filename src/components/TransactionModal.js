import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../utils/formatters';

/**
 * Reusable modal component untuk menampilkan detail transaksi
 */
const TransactionModal = ({
    visible,
    onClose,
    transaction,
    onPrint,
    primaryColor = theme.colors.primary,
    printing = false
}) => {
    if (!transaction) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Detail Transaksi</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.modalDate}>
                            {formatDateTime(transaction.createdAt)}
                        </Text>

                        <View style={styles.itemsList}>
                            {transaction.items?.map((item, index) => (
                                <View key={index} style={styles.detailItem}>
                                    <View style={styles.detailItemLeft}>
                                        <Text style={styles.detailItemName}>{item.name}</Text>
                                        <Text style={styles.detailItemQty}>
                                            {formatCurrency(item.price)} x {item.qty}
                                        </Text>
                                    </View>
                                    <Text style={styles.detailItemSubtotal}>
                                        {formatCurrency(item.subtotal)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(transaction.total)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Metode</Text>
                            <Text style={styles.summaryValue}>
                                {getPaymentMethodLabel(transaction.paymentMethod)}
                            </Text>
                        </View>
                        {transaction.paymentMethod === 'cash' && (
                            <>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Dibayar</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatCurrency(transaction.amountPaid)}
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Kembalian</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatCurrency(transaction.change)}
                                    </Text>
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.printButton, { backgroundColor: primaryColor }]}
                            onPress={() => onPrint(transaction)}
                            disabled={printing}
                        >
                            <Ionicons name="print-outline" size={20} color={theme.colors.white} />
                            <Text style={styles.printButtonText}>
                                {printing ? 'Mencetak...' : 'Cetak Struk'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        padding: theme.spacing.lg,
    },
    modalDate: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    itemsList: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    detailItemLeft: {
        flex: 1,
    },
    detailItemName: {
        fontSize: 14,
        color: theme.colors.text,
    },
    detailItemQty: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    detailItemSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xl,
        ...theme.shadow.sm,
    },
    printButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: theme.spacing.sm,
    },
});

export default TransactionModal;

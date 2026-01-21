/**
 * Utility functions untuk formatting data
 * Menggantikan duplikasi fungsi di berbagai screens
 */

/**
 * Format angka ke format mata uang Rupiah
 * @param {number} amount - Jumlah yang akan diformat
 * @returns {string} Format Rupiah contoh: "Rp 1.000.000"
 */
export const formatCurrency = (amount) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
};

/**
 * Format timestamp ke format tanggal Indonesia
 * @param {Date|Object|string} timestamp - Firestore timestamp atau Date object
 * @param {Object} options - Opsi tambahan untuk formatting
 * @returns {string} Format tanggal contoh: "21 Jan 2026"
 */
export const formatDate = (timestamp, options = {}) => {
    if (!timestamp) return '-';

    // Handle Firestore timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    const defaultOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options
    };

    return date.toLocaleDateString('id-ID', defaultOptions);
};

/**
 * Format timestamp ke format tanggal dan waktu Indonesia
 * @param {Date|Object|string} timestamp - Firestore timestamp atau Date object
 * @returns {string} Format tanggal dan waktu
 */
export const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format timestamp ke format waktu saja
 * @param {Date|Object|string} timestamp - Firestore timestamp atau Date object
 * @returns {string} Format waktu contoh: "14:30"
 */
export const formatTime = (timestamp) => {
    if (!timestamp) return '-';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format tanggal untuk struk (DD/MM/YYYY)
 * @param {Date|Object|string} d - Date object atau timestamp
 * @returns {string} Format tanggal DD/MM/YYYY
 */
export const formatReceiptDate = (d) => {
    const date = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Get label untuk payment method
 * @param {string} method - Payment method (cash, transfer, qris)
 * @returns {string} Label dalam Bahasa Indonesia
 */
export const getPaymentMethodLabel = (method) => {
    const labels = {
        cash: 'Tunai',
        transfer: 'Transfer',
        qris: 'QRIS'
    };
    return labels[method] || method;
};

/**
 * Get warna untuk status service
 * @param {string} status - Status service
 * @returns {string} Hex color code
 */
export const getStatusColor = (status) => {
    switch (status) {
        case 'completed':
            return '#4CAF50'; // Green
        case 'processing':
            return '#2196F3'; // Blue
        case 'cancelled':
            return '#F44336'; // Red
        default:
            return '#9E9E9E'; // Grey
    }
};

/**
 * Get label untuk status service
 * @param {string} status - Status service
 * @returns {string} Label dalam Bahasa Indonesia
 */
export const getStatusLabel = (status) => {
    switch (status) {
        case 'completed':
            return 'Selesai';
        case 'processing':
            return 'Dikerjakan';
        case 'cancelled':
            return 'Batal';
        default:
            return 'Baru';
    }
};

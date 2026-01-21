/**
 * Utility functions untuk generate receipt HTML
 * Menggantikan duplikasi generateHtml() di berbagai screens
 */

import { getPaymentMethodLabel } from './formatters';

/**
 * Generate HTML untuk struk penjualan (sales receipt)
 * @param {Object} transactionData - Data transaksi
 * @param {Object} storeSettings - Pengaturan toko
 * @returns {string} HTML string untuk struk
 */
export const generateSalesReceiptHtml = (transactionData, storeSettings) => {
    const {
        storeName = 'WP CELL',
        storeTagline = 'Service HP Software & Hardware',
        storeAddress = '',
        storePhone = ''
    } = storeSettings || {};

    const date = transactionData.createdAt?.toDate
        ? transactionData.createdAt.toDate()
        : new Date(transactionData.createdAt || new Date());

    const itemsHtml = transactionData.items?.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="flex: 1;">${item.name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
            <span>${item.qty} x ${item.price.toLocaleString('id-ID')}</span>
            <span>${(item.subtotal || item.price * item.qty).toLocaleString('id-ID')}</span>
        </div>
    `).join('') || '';

    const pm = getPaymentMethodLabel(transactionData.paymentMethod);

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    body {
                        width: 54mm;
                        margin: 0 auto;
                        padding: 2mm 0;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 10pt;
                        line-height: 1.2;
                        color: #000;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-bottom: 1px dashed #000; margin: 2mm 0; }
                    .row { display: flex; justify-content: space-between; }
                    .footer-line { text-align: center; font-size: 9pt; margin-top: 1mm; }
                </style>
            </head>
            <body>
                <div class="center divider" style="padding-bottom: 2mm;">
                    <div style="font-size: 14pt; font-weight: bold;">${storeName}</div>
                    <div style="font-size: 10pt; margin-top: 1mm;">${storeTagline}</div>
                    ${storeAddress ? `<div style="font-size: 9pt;">${storeAddress}</div>` : ''}
                    ${storePhone ? `<div style="font-size: 9pt;">WA: ${storePhone}</div>` : ''}
                </div>
                
                <div class="row" style="font-size: 9pt; margin-bottom: 2mm;">
                    <span>Tgl: ${date.toLocaleDateString('id-ID')}</span>
                    <span>Jam: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div class="divider">
                    ${itemsHtml}
                </div>

                <div style="margin-bottom: 2mm;">
                    <div class="row bold" style="font-size: 12pt;">
                        <span>TOTAL</span>
                        <span>Rp ${transactionData.total.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="row" style="font-size: 9pt; margin-top: 1mm;">
                        <span>Bayar (${pm})</span>
                        <span>${(transactionData.amountPaid || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div class="row" style="font-size: 9pt;">
                        <span>Kembalian</span>
                        <span>${(transactionData.change || 0).toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <div class="center" style="margin-top: 4mm; border-top: 1px dashed #000; padding-top: 2mm;">
                    <div class="footer-line">Terima Kasih</div>
                    <div class="footer-line">Sudah Belanja di ${storeName}</div>
                </div>
            </body>
        </html>
    `;
};

/**
 * Generate HTML untuk struk service
 * @param {Object} serviceData - Data service
 * @param {Object} storeSettings - Pengaturan toko
 * @returns {string} HTML string untuk struk service
 */
export const generateServiceReceiptHtml = (serviceData, storeSettings) => {
    const {
        serviceNumber = 'SVC-000001',
        customerName = '',
        customerPhone = '',
        phoneBrand = '',
        phoneType = '',
        imei = '',
        damageDescription = '',
        cost = 0,
        warranty = '-',
        date = new Date(),
    } = serviceData || {};

    const {
        storeName = 'WP CELL',
        storeTagline = 'Service HP Software & Hardware',
        storeAddress = '',
        storePhone = '',
    } = storeSettings || {};

    const formatDate = (d) => {
        const dateObj = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
        return dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (d) => {
        const dateObj = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
        return dateObj.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @page {
                    size: 58mm auto;
                    margin: 0;
                }
                body {
                    width: 54mm;
                    margin: 0 auto;
                    padding: 2mm 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt;
                    line-height: 1.2;
                    color: #000;
                    box-sizing: border-box;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 4px 0; }
                .row { display: flex; justify-content: space-between; }
                .header-name { font-size: 14pt; font-weight: bold; margin-bottom: 2mm; }
                .footer-line { text-align: center; font-size: 9pt; margin-top: 1mm; }
            </style>
        </head>
        <body>
            <div class="center header-name">${storeName}</div>
            <div class="center">${storeTagline}</div>
            ${storeAddress ? `<div class="center">${storeAddress}</div>` : ''}
            ${storePhone ? `<div class="center">WA : ${storePhone}</div>` : ''}
            <div class="divider"></div>
            <div class="row">
                <span>${formatDate(date)}</span>
                <span>${formatTime(date)}</span>
            </div>
            <div>No Service : ${serviceNumber}</div>
            <div class="divider"></div>
            <div class="center bold">* Customer *</div>
            <div>Nama     : ${customerName}</div>
            <div>Nomor HP : ${customerPhone || '-'}</div>
            <div class="divider"></div>
            <div>Merk HP  : ${phoneBrand}</div>
            <div>Type HP  : ${phoneType || '-'}</div>
            <div>Imei     : ${imei || '-'}</div>
            <div>Kerusakan: ${damageDescription}</div>
            <div class="divider"></div>
            <div class="bold">Biaya    : Rp ${(cost || 0).toLocaleString('id-ID')}</div>
            <div>Garansi  : ${warranty}</div>
            <div class="divider"></div>
            <div class="footer-line">Terima Kasih Atas Kepercayaan Anda</div>
            <div class="footer-line">Kepuasan Konsumen Adalah Prioritas Kami</div>
        </body>
        </html>
    `;
};

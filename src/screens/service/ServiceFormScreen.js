import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, limit, serverTimestamp, deleteDoc } from 'firebase/firestore';
import Input from '../../components/Input';
import Button from '../../components/Button';

const WARRANTY_OPTIONS = [
    'Tanpa Garansi',
    '1 Hari',
    '3 Hari',
    '7 Hari',
    '14 Hari',
    '1 Bulan',
    '3 Bulan',
];

const STATUS_OPTIONS = [
    { label: 'Dikerjakan', value: 'processing', color: '#2196F3' },
    { label: 'Selesai', value: 'completed', color: '#4CAF50' },
    { label: 'Batal', value: 'cancelled', color: '#F44336' },
];

const ServiceFormScreen = ({ navigation, route }) => {
    const { ownerId } = useAuth();
    const { primaryColor, themeColors } = useTheme();
    const existingService = route.params?.service;
    const isEditing = !!existingService;

    const [customerName, setCustomerName] = useState(existingService?.customerName || '');
    const [customerPhone, setCustomerPhone] = useState(existingService?.customerPhone || '');
    const [phoneBrand, setPhoneBrand] = useState(existingService?.phoneBrand || '');
    const [phoneType, setPhoneType] = useState(existingService?.phoneType || '');
    const [imei, setImei] = useState(existingService?.imei || '');
    const [damageDescription, setDamageDescription] = useState(existingService?.damageDescription || '');
    const [partCost, setPartCost] = useState(existingService?.partCost?.toString() || '');
    const [cost, setCost] = useState(existingService?.cost?.toString() || '');
    const [warranty, setWarranty] = useState(existingService?.warranty || 'Tanpa Garansi');
    const [status, setStatus] = useState(existingService?.status || 'processing');
    const [loading, setLoading] = useState(false);
    const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [errors, setErrors] = useState({});
    const [storeSettings, setStoreSettings] = useState({});

    useEffect(() => {
        loadStoreSettings();
    }, [ownerId]);

    const loadStoreSettings = async () => {
        if (!ownerId) return;
        try {
            const settingsDoc = await getDoc(doc(db, 'users', ownerId, 'settings', 'store'));
            if (settingsDoc.exists()) {
                setStoreSettings(settingsDoc.data());
            }
        } catch (error) {
            console.error('Error loading store settings:', error);
        }
    };

    const generateServiceNumber = async () => {
        try {
            const servicesRef = collection(db, 'users', ownerId, 'services');
            const q = query(servicesRef, orderBy('createdAt', 'desc'), limit(1));
            const snapshot = await getDocs(q);

            let nextNumber = 1;
            if (!snapshot.empty) {
                const lastService = snapshot.docs[0].data();
                const lastNumber = parseInt(lastService.serviceNumber?.replace('SVC-', '') || '0');
                nextNumber = lastNumber + 1;
            }

            return `SVC-${nextNumber.toString().padStart(6, '0')}`;
        } catch (error) {
            console.error('Error generating service number:', error);
            return `SVC-${Date.now()}`;
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!customerName.trim()) newErrors.customerName = 'Nama customer wajib diisi';
        if (!phoneBrand.trim()) newErrors.phoneBrand = 'Merk HP wajib diisi';
        if (!damageDescription.trim()) newErrors.damageDescription = 'Kerusakan wajib diisi';
        if (cost && isNaN(parseFloat(cost))) newErrors.cost = 'Biaya tidak valid';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const serviceData = {
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                phoneBrand: phoneBrand.trim(),
                phoneType: phoneType.trim(),
                imei: imei.trim(),
                damageDescription: damageDescription.trim(),
                partCost: parseFloat(partCost) || 0,
                cost: parseFloat(cost) || 0,
                warranty,
                status,
                updatedAt: serverTimestamp(),
            };

            if (isEditing) {
                await updateDoc(doc(db, 'users', ownerId, 'services', existingService.id), serviceData);
                Alert.alert('Berhasil', 'Service berhasil diperbarui');
                navigation.goBack();
            } else {
                const serviceNumber = await generateServiceNumber();
                serviceData.serviceNumber = serviceNumber;
                serviceData.createdAt = serverTimestamp();

                const docRef = await addDoc(collection(db, 'users', ownerId, 'services'), serviceData);

                navigation.navigate('ReceiptPreview', {
                    serviceData: {
                        ...serviceData,
                        id: docRef.id,
                        date: new Date(),
                    },
                    storeSettings,
                });
            }
        } catch (error) {
            console.error('Error saving service:', error);
            Alert.alert('Error', 'Gagal menyimpan service');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            'Hapus Service',
            'Yakin ingin menghapus data service ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteDoc(doc(db, 'users', ownerId, 'services', existingService.id));
                            Alert.alert('Berhasil', 'Service berhasil dihapus');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error deleting service:', error);
                            Alert.alert('Error', 'Gagal menghapus service');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handlePreview = () => {
        if (!validate()) return;

        const previewData = {
            serviceNumber: existingService?.serviceNumber || 'SVC-XXXXXX',
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            phoneBrand: phoneBrand.trim(),
            phoneType: phoneType.trim(),
            imei: imei.trim(),
            damageDescription: damageDescription.trim(),
            cost: parseFloat(cost) || 0,
            warranty,
            date: new Date(),
        };

        navigation.navigate('ReceiptPreview', {
            serviceData: previewData,
            storeSettings,
            isPreviewOnly: true,
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={primaryColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: primaryColor }]}>{isEditing ? 'Edit Layanan' : 'Input Layanan Baru'}</Text>
                    <TouchableOpacity onPress={handlePreview} style={styles.previewIcon}>
                        <Ionicons name="receipt-outline" size={24} color={primaryColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Data Customer</Text>

                    <Input
                        label="Nama Customer *"
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Nama lengkap customer"
                        error={errors.customerName}
                        icon="person-outline"
                    />

                    <Input
                        label="Nomor HP Customer"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="08xxxxxxxxxx"
                        keyboardType="phone-pad"
                        icon="call-outline"
                    />

                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Data Perangkat</Text>

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Input
                                label="Merk HP *"
                                value={phoneBrand}
                                onChangeText={setPhoneBrand}
                                placeholder="Samsung, iPhone, dll"
                                error={errors.phoneBrand}
                                icon="phone-portrait-outline"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Input
                                label="Type HP"
                                value={phoneType}
                                onChangeText={setPhoneType}
                                placeholder="Galaxy A52, dll"
                                icon="hardware-chip-outline"
                            />
                        </View>
                    </View>

                    <Input
                        label="IMEI"
                        value={imei}
                        onChangeText={setImei}
                        placeholder="Nomor IMEI (opsional)"
                        keyboardType="numeric"
                        icon="barcode-outline"
                    />

                    <Input
                        label="Kerusakan *"
                        value={damageDescription}
                        onChangeText={setDamageDescription}
                        placeholder="Deskripsi kerusakan (tekan Enter untuk baris baru)"
                        error={errors.damageDescription}
                        icon="construct-outline"
                        multiline={true}
                    />

                    <Input
                        label="Harga Modal Part (Opsional)"
                        value={partCost}
                        onChangeText={setPartCost}
                        placeholder="0"
                        keyboardType="numeric"
                        icon="pricetag-outline"
                    />

                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Biaya & Garansi</Text>

                    <Input
                        label="Biaya Service"
                        value={cost}
                        onChangeText={setCost}
                        placeholder="0"
                        keyboardType="numeric"
                        error={errors.cost}
                        icon="cash-outline"
                    />

                    <Text style={[styles.inputLabel, { color: themeColors.text }]}>Status Service</Text>
                    <TouchableOpacity
                        style={[styles.pickerButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                        onPress={() => {
                            setShowStatusPicker(!showStatusPicker);
                            setShowWarrantyPicker(false);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.statusDot, { backgroundColor: STATUS_OPTIONS.find(s => s.value === status)?.color }]} />
                            <Text style={styles.pickerText}>
                                {STATUS_OPTIONS.find(s => s.value === status)?.label || status}
                            </Text>
                        </View>
                        <Ionicons
                            name={showStatusPicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showStatusPicker && (
                        <View style={styles.pickerList}>
                            {STATUS_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.pickerItem,
                                        status === option.value && styles.pickerItemSelected
                                    ]}
                                    onPress={() => {
                                        setStatus(option.value);
                                        setShowStatusPicker(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                                        <Text style={[
                                            styles.pickerItemText,
                                            status === option.value && styles.pickerItemTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <Text style={styles.inputLabel}>Garansi</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => {
                            setShowWarrantyPicker(!showWarrantyPicker);
                            setShowStatusPicker(false);
                        }}
                    >
                        <Text style={styles.pickerText}>{warranty}</Text>
                        <Ionicons
                            name={showWarrantyPicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showWarrantyPicker && (
                        <View style={styles.pickerList}>
                            {WARRANTY_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.pickerItem,
                                        warranty === option && styles.pickerItemSelected
                                    ]}
                                    onPress={() => {
                                        setWarranty(option);
                                        setShowWarrantyPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.pickerItemText,
                                        warranty === option && styles.pickerItemTextSelected
                                    ]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <Button
                            title={isEditing ? 'Simpan Perubahan' : 'Cetak & Simpan'}
                            onPress={handleSave}
                            loading={loading}
                        />
                        {isEditing && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDelete}
                                disabled={loading}
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                <Text style={styles.deleteButtonText}>Hapus Service</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    previewIcon: {
        padding: theme.spacing.xs,
    },
    form: {
        flex: 1,
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        marginHorizontal: -theme.spacing.xs,
    },
    halfInput: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 4,
        marginTop: 6,
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.sm,
        height: 44,
    },
    pickerText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: theme.spacing.sm,
    },
    pickerList: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        ...theme.shadow.sm,
    },
    pickerItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerItemSelected: {
        backgroundColor: theme.colors.primary + '10',
    },
    pickerItemText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerItemTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    deleteButtonText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: theme.spacing.sm,
    },
});

export default ServiceFormScreen;

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
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
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import Input from '../../components/Input';
import Button from '../../components/Button';

const CATEGORIES = [
    'Aksesoris',
    'Casing',
    'Charger',
    'Earphone',
    'Kabel Data',
    'Kartu Perdana',
    'Pulsa',
    'Screen Protector',
    'Lainnya'
];

const ProductFormScreen = ({ navigation, route }) => {
    const { ownerId } = useAuth();
    const { primaryColor } = useTheme();
    const existingProduct = route.params?.product;
    const isEditing = !!existingProduct;

    const [name, setName] = useState(existingProduct?.name || '');
    const [category, setCategory] = useState(existingProduct?.category || '');
    const [buyPrice, setBuyPrice] = useState(existingProduct?.buyPrice?.toString() || '');
    const [sellPrice, setSellPrice] = useState(existingProduct?.sellPrice?.toString() || '');
    const [stock, setStock] = useState(existingProduct?.stock?.toString() || '');
    const [barcode, setBarcode] = useState(existingProduct?.barcode || '');
    const [loading, setLoading] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'Nama produk wajib diisi';
        if (!sellPrice.trim()) newErrors.sellPrice = 'Harga jual wajib diisi';
        if (sellPrice && isNaN(parseFloat(sellPrice))) newErrors.sellPrice = 'Harga tidak valid';
        if (buyPrice && isNaN(parseFloat(buyPrice))) newErrors.buyPrice = 'Harga tidak valid';
        if (stock && isNaN(parseInt(stock))) newErrors.stock = 'Stok tidak valid';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const productData = {
                name: name.trim(),
                category: category || 'Lainnya',
                buyPrice: parseFloat(buyPrice) || 0,
                sellPrice: parseFloat(sellPrice) || 0,
                stock: parseInt(stock) || 0,
                barcode: barcode.trim(),
                updatedAt: serverTimestamp(),
            };

            if (isEditing) {
                await updateDoc(doc(db, 'users', ownerId, 'products', existingProduct.id), productData);
                Alert.alert('Berhasil', 'Produk berhasil diperbarui');
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'users', ownerId, 'products'), productData);
                Alert.alert('Berhasil', 'Produk berhasil ditambahkan');
            }
            navigation.goBack();
        } catch (error) {
            console.error('Error saving product:', error);
            Alert.alert('Error', 'Gagal menyimpan produk');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: primaryColor }]}>{isEditing ? 'Edit Produk' : 'Tambah Produk'}</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    <Input
                        label="Nama Produk *"
                        value={name}
                        onChangeText={setName}
                        placeholder="Contoh: Charger iPhone 20W"
                        error={errors.name}
                        icon="pricetag-outline"
                    />

                    <Text style={styles.inputLabel}>Kategori</Text>
                    <TouchableOpacity
                        style={styles.categoryButton}
                        onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                    >
                        <Text style={category ? styles.categoryText : styles.categoryPlaceholder}>
                            {category || 'Pilih kategori'}
                        </Text>
                        <Ionicons
                            name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showCategoryPicker && (
                        <View style={styles.categoryList}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryItem,
                                        category === cat && { backgroundColor: primaryColor + '10' }
                                    ]}
                                    onPress={() => {
                                        setCategory(cat);
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.categoryItemText,
                                        category === cat && { color: primaryColor, fontWeight: '600' }
                                    ]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Input
                                label="Harga Beli"
                                value={buyPrice}
                                onChangeText={setBuyPrice}
                                placeholder="0"
                                keyboardType="numeric"
                                error={errors.buyPrice}
                                icon="wallet-outline"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Input
                                label="Harga Jual *"
                                value={sellPrice}
                                onChangeText={setSellPrice}
                                placeholder="0"
                                keyboardType="numeric"
                                error={errors.sellPrice}
                                icon="cash-outline"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Input
                                label="Stok Awal"
                                value={stock}
                                onChangeText={setStock}
                                placeholder="0"
                                keyboardType="numeric"
                                error={errors.stock}
                                icon="layers-outline"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Input
                                label="Barcode (Opsional)"
                                value={barcode}
                                onChangeText={setBarcode}
                                placeholder="Scan atau ketik"
                                icon="barcode-outline"
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Button
                            title={isEditing ? 'Simpan Perubahan' : 'Tambah Produk'}
                            onPress={handleSave}
                            loading={loading}
                        />
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
    placeholder: {
        width: 32,
    },
    form: {
        flex: 1,
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    categoryButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        height: 48,
    },
    categoryText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    categoryPlaceholder: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    categoryList: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        ...theme.shadow.sm,
    },
    categoryItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    categoryItemSelected: {
        backgroundColor: theme.colors.primary + '10',
    },
    categoryItemText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    categoryItemTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        marginHorizontal: -theme.spacing.xs,
    },
    halfInput: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
    buttonContainer: {
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
});

export default ProductFormScreen;

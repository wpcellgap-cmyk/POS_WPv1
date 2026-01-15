import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';

const ProductListScreen = ({ navigation }) => {
    const { ownerId } = useAuth();
    const { primaryColor } = useTheme();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ownerId) return;

        const productsRef = collection(db, 'users', ownerId, 'products');
        const q = query(productsRef, orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productList);
            setFilteredProducts(productList);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching products:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const handleDeleteProduct = (productId, productName) => {
        Alert.alert(
            'Hapus Produk',
            `Yakin ingin menghapus "${productName}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', ownerId, 'products', productId));
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus produk');
                        }
                    }
                }
            ]
        );
    };

    const formatCurrency = (amount) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => navigation.navigate('ProductForm', { product: item })}
            onLongPress={() => handleDeleteProduct(item.id, item.name)}
        >
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productPrice, { color: primaryColor }]}>{formatCurrency(item.sellPrice)}</Text>
                <Text style={styles.productStock}>Stok: {item.stock}</Text>
            </View>
            <View style={styles.stockBadge}>
                <Text style={[
                    styles.stockText,
                    item.stock <= 5 && styles.lowStock
                ]}>
                    Stok: {item.stock || 0}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                <Text style={[styles.title, { color: primaryColor }]}>Manajemen Stok</Text>
                <Text style={styles.subtitle}>{products.length} produk</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari produk atau kategori..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.textSecondary}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery ? 'Coba kata kunci lain' : 'Tap tombol + untuk menambah produk'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: primaryColor }]}
                onPress={() => navigation.navigate('ProductForm')}
            >
                <Ionicons name="add" size={28} color={theme.colors.white} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        height: 48,
        ...theme.shadow.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        fontSize: 16,
        color: theme.colors.text,
    },
    listContainer: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        paddingBottom: theme.spacing.xl * 4,
    },
    productCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...theme.shadow.sm,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    productCategory: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        marginTop: 4,
    },
    stockBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    stockText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    lowStock: {
        color: theme.colors.error,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.md,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
    },
    fab: {
        position: 'absolute',
        right: theme.spacing.lg,
        bottom: theme.spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1E88E5', // Fallback, context used in component
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadow.md,
    },
});

export default ProductListScreen;

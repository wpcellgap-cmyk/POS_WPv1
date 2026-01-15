import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const CashierScreen = ({ navigation }) => {
    const { ownerId } = useAuth();
    const { primaryColor } = useTheme();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);

    useEffect(() => {
        if (!ownerId) return;

        const productsRef = collection(db, 'users', ownerId, 'products');
        const q = query(productsRef, orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(p => p.stock > 0);
            setProducts(productList);
            setFilteredProducts(productList);
        });

        return unsubscribe;
    }, [ownerId]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const addToCart = (product) => {
        const existingIndex = cart.findIndex(item => item.id === product.id);
        if (existingIndex >= 0) {
            const newCart = [...cart];
            if (newCart[existingIndex].qty < product.stock) {
                newCart[existingIndex].qty += 1;
                setCart(newCart);
            } else {
                Alert.alert('Stok Habis', `Stok ${product.name} tidak mencukupi`);
            }
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const updateQty = (productId, delta) => {
        const existingIndex = cart.findIndex(item => item.id === productId);
        if (existingIndex >= 0) {
            const newCart = [...cart];
            const product = products.find(p => p.id === productId);
            const newQty = newCart[existingIndex].qty + delta;

            if (newQty <= 0) {
                newCart.splice(existingIndex, 1);
            } else if (newQty <= product.stock) {
                newCart[existingIndex].qty = newQty;
            } else {
                Alert.alert('Stok Terbatas', `Maksimal stok: ${product.stock}`);
                return;
            }
            setCart(newCart);
        }
    };

    const getTotal = () => {
        return cart.reduce((sum, item) => sum + (item.sellPrice * item.qty), 0);
    };

    const getTotalItems = () => {
        return cart.reduce((sum, item) => sum + item.qty, 0);
    };

    const formatCurrency = (amount) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const handleCheckout = () => {
        if (cart.length === 0) {
            Alert.alert('Keranjang Kosong', 'Tambahkan produk terlebih dahulu');
            return;
        }
        navigation.navigate('Checkout', { cart, total: getTotal() });
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        Alert.alert(
            'Hapus Keranjang',
            'Yakin ingin mengosongkan keranjang?',
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => setCart([]) }
            ]
        );
    };

    const renderProduct = ({ item }) => {
        const inCart = cart.find(c => c.id === item.id);
        return (
            <TouchableOpacity
                style={[styles.productCard, inCart && styles.productInCart]}
                onPress={() => addToCart(item)}
            >
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.productPrice, { color: primaryColor }]}>{formatCurrency(item.sellPrice)}</Text>
                    <Text style={styles.productStock}>Stok: {item.stock}</Text>
                </View>
                {inCart && (
                    <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>{inCart.qty}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>{formatCurrency(item.sellPrice * item.qty)}</Text>
            </View>
            <View style={styles.qtyControls}>
                <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQty(item.id, -1)}
                >
                    <Ionicons name="remove" size={18} color={primaryColor} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.qty}</Text>
                <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQty(item.id, 1)}
                >
                    <Ionicons name="add" size={18} color={primaryColor} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>Kasir</Text>
                {cart.length > 0 && (
                    <TouchableOpacity onPress={clearCart}>
                        <Text style={styles.clearText}>Hapus Semua</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            <View style={styles.content}>
                <View style={styles.productSection}>
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderProduct}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        contentContainerStyle={styles.productGrid}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={48} color={theme.colors.textSecondary} />
                                <Text style={styles.emptyText}>Tidak ada produk tersedia</Text>
                            </View>
                        }
                    />
                </View>

                <View style={styles.cartSection}>
                    <View style={styles.cartHeader}>
                        <Text style={styles.cartTitle}>Keranjang</Text>
                        <Text style={styles.cartCount}>{getTotalItems()} item</Text>
                    </View>

                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Ionicons name="cart-outline" size={48} color={theme.colors.textSecondary} />
                            <Text style={styles.emptyCartText}>Keranjang kosong</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={cart}
                            renderItem={renderCartItem}
                            keyExtractor={(item) => item.id}
                            style={styles.cartList}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    <View style={styles.cartFooter}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>{formatCurrency(getTotal())}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.checkoutButton, { backgroundColor: primaryColor }, cart.length === 0 && styles.checkoutDisabled]}
                            onPress={handleCheckout}
                            disabled={cart.length === 0}
                        >
                            <Text style={styles.checkoutText}>Bayar</Text>
                            <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    clearText: {
        fontSize: 14,
        color: theme.colors.error,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        height: 44,
        ...theme.shadow.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        fontSize: 16,
        color: theme.colors.text,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    productSection: {
        flex: 1.5,
        paddingLeft: theme.spacing.lg,
    },
    productGrid: {
        paddingRight: theme.spacing.sm,
        paddingBottom: theme.spacing.xl * 4,
    },
    productCard: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        margin: theme.spacing.xs,
        ...theme.shadow.sm,
    },
    productInCart: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    productStock: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    qtyBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    cartSection: {
        flex: 1,
        backgroundColor: theme.colors.white,
        marginLeft: theme.spacing.sm,
        marginRight: theme.spacing.lg,
        marginBottom: theme.spacing.xl * 3,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadow.md,
    },
    cartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    cartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    cartCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCartText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
    cartList: {
        flex: 1,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
    },
    cartItemPrice: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    qtyButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginHorizontal: theme.spacing.sm,
        minWidth: 20,
        textAlign: 'center',
    },
    cartFooter: {
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    totalLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    checkoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
    },
    checkoutDisabled: {
        backgroundColor: theme.colors.textSecondary,
    },
    checkoutText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginRight: theme.spacing.xs,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
});

export default CashierScreen;

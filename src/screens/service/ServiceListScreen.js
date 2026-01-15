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

const ServiceListScreen = ({ navigation }) => {
    const { ownerId } = useAuth();
    const { primaryColor } = useTheme();
    const [services, setServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ownerId) return;

        const servicesRef = collection(db, 'users', ownerId, 'services');
        const q = query(servicesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serviceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setServices(serviceList);
            setFilteredServices(serviceList);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching services:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredServices(services);
        } else {
            const filtered = services.filter(service =>
                service.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                service.serviceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                service.phoneBrand?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredServices(filtered);
        }
    }, [searchQuery, services]);

    const formatCurrency = (amount) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return '#4CAF50'; // Green
            case 'processing':
                return '#2196F3'; // Blue
            case 'cancelled':
                return '#F44336'; // Red
            default:
                return theme.colors.textSecondary;
        }
    };

    const getStatusLabel = (status) => {
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

    const handleDeleteService = (serviceId, customerName) => {
        Alert.alert(
            'Hapus Service',
            `Yakin ingin menghapus service untuk "${customerName}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', ownerId, 'services', serviceId));
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus service');
                        }
                    }
                }
            ]
        );
    };

    const renderService = ({ item }) => (
        <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => navigation.navigate('ServiceForm', { service: item })}
            onLongPress={() => handleDeleteService(item.id, item.customerName)}
        >
            <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>{item.serviceNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
            </View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.phoneInfo}>{item.phoneBrand} {item.phoneType}</Text>
            <View style={styles.serviceFooter}>
                <Text style={styles.serviceDate}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.serviceCost}>{formatCurrency(item.cost)}</Text>
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
                <View>
                    <Text style={[styles.title, { color: primaryColor }]}>Daftar Layanan</Text>
                    <Text style={styles.subtitle}>{services.length} total layanan</Text>
                </View>
                <View style={styles.headerActions}>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari nama, nomor service, atau merk HP..."
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

            {filteredServices.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="construct-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'Service tidak ditemukan' : 'Belum ada service'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery ? 'Coba kata kunci lain' : 'Tap tombol + untuk menambah service'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredServices}
                    renderItem={renderService}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: primaryColor }]}
                onPress={() => navigation.navigate('ServiceForm')}
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
    serviceCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.sm,
    },
    serviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    serviceNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    phoneInfo: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    serviceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    serviceDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    serviceCost: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
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
        backgroundColor: '#1E88E5', // Fallback
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadow.md,
    },
});

export default ServiceListScreen;

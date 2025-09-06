import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES, FONTS } from '../theme';

const AdminDashboardScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user, signOut } = useAuth();

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const { data: userData, error: userError } = await supabase
      .from('restaurant_users')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching restaurant assignment:', userError);
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', userData.restaurant_id);

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data);
    }
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
    } else {
      fetchOrders();
    }
  };

  const sections = [
    { title: 'Pending', data: orders.filter(o => o.status === 'Pending') },
    { title: 'Accepted', data: orders.filter(o => o.status === 'Accepted') },
    { title: 'Completed', data: orders.filter(o => o.status === 'Completed') },
    { title: 'Rejected', data: orders.filter(o => o.status === 'Rejected') },
  ].filter(section => section.data.length > 0);

  const renderOrder = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.daily_order_number}</Text>
        <Text style={styles.orderTotal}>₹{item.total.toFixed(2)}</Text>
      </View>
      <Text style={styles.customerName}>Customer: {item.customer_name}</Text>
      <View style={styles.buttonContainer}>
        {item.status === 'Pending' && (
          <>
            <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.success}]} onPress={() => updateOrderStatus(item.id, 'Accepted')}>
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.danger}]} onPress={() => updateOrderStatus(item.id, 'Rejected')}>
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'Accepted' && (
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.primary}]} onPress={() => updateOrderStatus(item.id, 'Completed')}>
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No orders found.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightGray,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SIZES.padding,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.secondary,
    },
    logoutButton: {
        ...FONTS.h3,
        color: COLORS.primary,
    },
    sectionHeader: {
        ...FONTS.h3,
        padding: SIZES.padding,
        backgroundColor: COLORS.lightGray,
        color: COLORS.secondary,
    },
    orderItem: {
        backgroundColor: COLORS.white,
        padding: SIZES.padding,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    orderId: {
        ...FONTS.h3,
        color: COLORS.secondary,
    },
    orderTotal: {
        ...FONTS.h3,
        color: COLORS.secondary,
    },
    customerName: {
        ...FONTS.body4,
        color: COLORS.darkGray,
        marginVertical: SIZES.base,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SIZES.base,
    },
    actionButton: {
        paddingVertical: SIZES.base,
        paddingHorizontal: SIZES.padding,
        borderRadius: SIZES.radius,
        marginLeft: SIZES.base,
    },
    actionButtonText: {
        ...FONTS.body4,
        color: COLORS.white,
    },
    emptyText: {
        ...FONTS.body3,
        textAlign: 'center',
        marginTop: SIZES.padding * 2,
        color: COLORS.darkGray,
    },
});

export default AdminDashboardScreen;

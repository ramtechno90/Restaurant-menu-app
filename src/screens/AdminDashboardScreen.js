import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, Button, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const AdminDashboardScreen = () => {
  const [orders, setOrders] = useState([]);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('restaurant_users')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching restaurant assignment:', userError);
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
    };

    fetchOrders();
  }, [user]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
    } else {
      // Refresh orders
      const fetchOrders = async () => {
        if (!user) return;

        const { data: userData, error: userError } = await supabase
          .from('restaurant_users')
          .select('restaurant_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching restaurant assignment:', userError);
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
      };
      fetchOrders();
    }
  };

  const sections = [
    { title: 'Pending', data: orders.filter(o => o.status === 'Pending') },
    { title: 'Accepted', data: orders.filter(o => o.status === 'Accepted') },
    { title: 'Completed', data: orders.filter(o => o.status === 'Completed') },
    { title: 'Rejected', data: orders.filter(o => o.status === 'Rejected') },
  ];

  const renderOrder = ({ item }) => (
    <View style={styles.orderItem}>
      <Text>Order #{item.daily_order_number}</Text>
      <Text>Customer: {item.customer_name}</Text>
      <Text>Total: ₹{item.total}</Text>
      <View style={styles.buttonContainer}>
        {item.status === 'Pending' && (
          <>
            <Button title="Accept" onPress={() => updateOrderStatus(item.id, 'Accepted')} />
            <Button title="Reject" onPress={() => updateOrderStatus(item.id, 'Rejected')} />
          </>
        )}
        {item.status === 'Accepted' && (
          <Button title="Complete" onPress={() => updateOrderStatus(item.id, 'Completed')} />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Logout" onPress={signOut} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#f2f2f2',
    padding: 10,
  },
  orderItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});

export default AdminDashboardScreen;

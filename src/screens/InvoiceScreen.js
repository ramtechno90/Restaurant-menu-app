import React from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

const InvoiceScreen = ({ navigation }) => {
  const { cart, clearCart } = useCart();
  const restaurantId = 1; // Hardcoded for now
  const currentUser = "Customer"; // Hardcoded for now

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    const orderPayload = {
      customer_name: currentUser,
      total: total,
      items: cart,
      status: 'Pending',
      restaurant_id: restaurantId,
      delivery_method: 'delivery', // Hardcoded for now
    };

    const { error } = await supabase.from('orders').insert([orderPayload]);

    if (error) {
      console.error('Error placing order:', error);
      // Handle error, e.g., show an alert
    } else {
      // Order placed successfully
      clearCart();
      navigation.navigate('Menu');
    }
  };

  const renderInvoiceItem = ({ item }) => (
    <View style={styles.invoiceItem}>
      <Text>{item.name} x {item.quantity}</Text>
      <Text>₹{item.price * item.quantity}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Invoice</Text>
      <FlatList
        data={cart}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
      />
      <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>
      <Button title="Place Order" onPress={handlePlaceOrder} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default InvoiceScreen;

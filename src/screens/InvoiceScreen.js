import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { COLORS, SIZES, FONTS } from '../theme';

const InvoiceScreen = ({ navigation }) => {
  const { cart, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const restaurantId = 1; // Hardcoded for now
  const currentUser = "Customer"; // Hardcoded for now

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    const orderPayload = {
      customer_name: currentUser,
      total: total,
      items: cart,
      status: 'Pending',
      restaurant_id: restaurantId,
      delivery_method: 'delivery', // Hardcoded for now
    };

    const { error } = await supabase.from('orders').insert([orderPayload]);

    setIsLoading(false);

    if (error) {
      console.error('Error placing order:', error);
      // In a real app, you would show an alert to the user
    } else {
      clearCart();
      navigation.navigate('Menu');
    }
  };

  const renderInvoiceItem = ({ item }) => (
    <View style={styles.invoiceItem}>
      <Text style={styles.itemName}>{item.name} x {item.quantity}</Text>
      <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Summary</Text>
      </View>
      <FlatList
        data={cart}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={<Text style={styles.listHeader}>Items</Text>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total:</Text>
          <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, isLoading && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.secondary,
  },
  listHeader: {
    ...FONTS.h3,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    color: COLORS.secondary,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
  },
  itemName: {
    ...FONTS.body3,
    color: COLORS.secondary,
  },
  itemTotal: {
    ...FONTS.h3,
    color: COLORS.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.padding,
  },
  totalText: {
    ...FONTS.h3,
    color: COLORS.secondary,
  },
  totalAmount: {
    ...FONTS.h2,
    color: COLORS.secondary,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
});

export default InvoiceScreen;

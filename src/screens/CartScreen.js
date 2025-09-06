import React from 'react';
import { View, Text, FlatList, Button, StyleSheet, SafeAreaView } from 'react-native';
import { useCart } from '../context/CartContext';

const CartScreen = ({ navigation }) => {
  const { cart, removeFromCart, updateQuantity } = useCart();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text>Quantity: {item.quantity}</Text>
      <Text>Price: ₹{item.price * item.quantity}</Text>
      <View style={styles.buttonContainer}>
        <Button title="+" onPress={() => updateQuantity(item.id, item.quantity + 1)} />
        <Button title="-" onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)} />
        <Button title="Remove" onPress={() => removeFromCart(item.id)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cart}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text>Your cart is empty</Text>}
      />
      <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>
      <Button title="Proceed to Checkout" onPress={() => navigation.navigate('Location')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  cartItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default CartScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

const MenuScreen = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const { addToCart } = useCart();
  const restaurantId = 1; // Hardcoded for now

  useEffect(() => {
    const fetchMenuData = async () => {
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError);
      } else {
        setMenuItems(items);
      }

      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (catsError) {
        console.error('Error fetching categories:', catsError);
      } else {
        setCategories(cats);
      }
    };

    fetchMenuData();
  }, []);

  const renderMenuItem = ({ item }) => (
    <View style={styles.menuItem}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemPrice}>₹{item.price}</Text>
      <Button title="Add to Cart" onPress={() => addToCart(item)} />
    </View>
  );

  const renderCategory = ({ item: category }) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{category.name}</Text>
      <FlatList
        data={menuItems.filter(menuItem => menuItem.category === category.name)}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerButtons}>
        <Button title="Go to Cart" onPress={() => navigation.navigate('Cart')} />
        <Button title="Admin Login" onPress={() => navigation.navigate('AdminLogin')} />
      </View>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  menuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
  },
});

export default MenuScreen;

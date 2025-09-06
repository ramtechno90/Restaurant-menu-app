import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { COLORS, SIZES, FONTS } from '../theme';

const MenuScreen = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const { addToCart, cart } = useCart();
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
      <View style={{flex: 1}}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Text style={styles.addButtonText}>ADD</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategory = ({ item: category }) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{category.name}</Text>
      <FlatList
        data={menuItems.filter(menuItem => menuItem.category === category.name)}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id.toString()}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartButton}>Cart ({cart.length})</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('AdminLogin')}>
        <Text style={styles.adminButton}>Go to Admin Login</Text>
      </TouchableOpacity>
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
    backgroundColor: COLORS.lightGray,
  },
  header: {
    padding: SIZES.padding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.secondary,
  },
  cartButton: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  adminButton: {
    ...FONTS.body4,
    color: COLORS.primary,
    textAlign: 'center',
    padding: SIZES.base,
  },
  categoryContainer: {
    marginTop: SIZES.padding,
  },
  categoryTitle: {
    ...FONTS.h2,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.base,
    color: COLORS.secondary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
  },
  itemName: {
    ...FONTS.h3,
    color: COLORS.secondary,
  },
  itemDescription: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginVertical: SIZES.base,
  },
  itemPrice: {
    ...FONTS.h3,
    color: COLORS.secondary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
  },
  addButtonText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: SIZES.padding,
  },
});

export default MenuScreen;

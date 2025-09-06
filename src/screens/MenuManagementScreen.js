import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES, FONTS } from '../theme';

const MenuManagementScreen = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const [adminRestaurantId, setAdminRestaurantId] = useState(null);

  const fetchRestaurantId = useCallback(async () => {
    if (!user) return;
    const { data: userData, error: userError } = await supabase
      .from('restaurant_users')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();
    if (userError || !userData) console.error('Error fetching restaurant assignment:', userError);
    else setAdminRestaurantId(userData.restaurant_id);
  }, [user]);

  useEffect(() => {
    fetchRestaurantId();
  }, [fetchRestaurantId]);

  const fetchData = useCallback(async () => {
    if (!adminRestaurantId) return;
    setRefreshing(true);
    const { data: items, error: itemsError } = await supabase.from('menu_items').select('*').eq('restaurant_id', adminRestaurantId);
    if (itemsError) console.error('Error fetching menu items', itemsError);
    else setMenuItems(items);

    const { data: cats, error: catsError } = await supabase.from('categories').select('*').eq('restaurant_id', adminRestaurantId);
    if (catsError) console.error('Error fetching categories', catsError);
    else setCategories(cats);
    setRefreshing(false);
  }, [adminRestaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = async () => {
    if (!newItemName || !newItemPrice) return;
    const { error } = await supabase.from('menu_items').insert([{ name: newItemName, price: newItemPrice, restaurant_id: adminRestaurantId, category: 'Default', in_stock: true, takeaway_available: true }]);
    if (error) Alert.alert('Error', error.message);
    else {
      setNewItemName('');
      setNewItemPrice('');
      fetchData();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName, restaurant_id: adminRestaurantId }]);
    if (error) Alert.alert('Error', error.message);
    else {
      setNewCategoryName('');
      fetchData();
    }
  };

  const handleDeleteItem = async (itemId) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) Alert.alert('Error', error.message);
    else fetchData();
  };

  const handleToggleStock = async (item) => {
    const { error } = await supabase.from('menu_items').update({ in_stock: !item.in_stock }).eq('id', item.id);
    if (error) Alert.alert('Error', error.message);
    else fetchData();
  };

  const renderMenuItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={{flex: 1}}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDetails}>Price: ₹{item.price}</Text>
        <Text style={styles.itemDetails}>In Stock: {item.in_stock ? 'Yes' : 'No'}</Text>
      </View>
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleStock(item)}>
          <Text style={styles.actionButtonText}>{item.in_stock ? 'Set OOS' : 'Set In Stock'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.danger}]} onPress={() => handleDeleteItem(item.id)}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Menu Management</Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add New Category</Text>
              <TextInput placeholder="Category Name" value={newCategoryName} onChangeText={setNewCategoryName} style={styles.input} />
              <TouchableOpacity style={styles.submitButton} onPress={handleAddCategory}><Text style={styles.submitButtonText}>Add Category</Text></TouchableOpacity>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add New Item</Text>
              <TextInput placeholder="Item Name" value={newItemName} onChangeText={setNewItemName} style={styles.input} />
              <TextInput placeholder="Item Price" value={newItemPrice} onChangeText={setNewItemPrice} style={styles.input} keyboardType="numeric" />
              <TouchableOpacity style={styles.submitButton} onPress={handleAddItem}><Text style={styles.submitButtonText}>Add Item</Text></TouchableOpacity>
            </View>
            <Text style={styles.listHeader}>Categories</Text>
            <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <Text style={styles.categoryItem}>{item.name}</Text>}
                />
            <Text style={styles.listHeader}>Menu Items</Text>
          </>
        }
        data={menuItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMenuItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightGray },
    headerContainer: { padding: SIZES.padding, alignItems: 'center' },
    headerTitle: { ...FONTS.h2, color: COLORS.secondary },
    formContainer: { backgroundColor: COLORS.white, padding: SIZES.padding, margin: SIZES.padding, borderRadius: SIZES.radius },
    formTitle: { ...FONTS.h3, color: COLORS.secondary, marginBottom: SIZES.base },
    input: { ...FONTS.body3, backgroundColor: COLORS.lightGray, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.base },
    submitButton: { backgroundColor: COLORS.primary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center' },
    submitButtonText: { ...FONTS.h3, color: COLORS.white },
    listHeader: { ...FONTS.h2, color: COLORS.secondary, paddingHorizontal: SIZES.padding, marginTop: SIZES.padding },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: SIZES.padding, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    itemName: { ...FONTS.h3, color: COLORS.secondary, flex: 1 },
    itemDetails: { ...FONTS.body4, color: COLORS.darkGray },
    categoryItem: { ...FONTS.body3, color: COLORS.secondary, padding: SIZES.padding, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    buttonGroup: { flexDirection: 'column' },
    actionButton: { padding: SIZES.base, borderRadius: SIZES.radius, marginVertical: 4, backgroundColor: COLORS.secondary },
    actionButtonText: { ...FONTS.body4, color: COLORS.white, textAlign: 'center' },
});

export default MenuManagementScreen;

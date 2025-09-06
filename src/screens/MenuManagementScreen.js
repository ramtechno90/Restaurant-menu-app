import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, SafeAreaView, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const MenuManagementScreen = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const { user } = useAuth();

  const [adminRestaurantId, setAdminRestaurantId] = useState(null);

  useEffect(() => {
    const fetchRestaurantId = async () => {
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
        setAdminRestaurantId(userData.restaurant_id);
    }
    fetchRestaurantId();
  }, [user]);

  const fetchMenuItems = async () => {
    if(!adminRestaurantId) return;
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', adminRestaurantId);
    if (error) console.error('Error fetching menu items', error);
    else setMenuItems(data);
  };

  const fetchCategories = async () => {
    if(!adminRestaurantId) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', adminRestaurantId);
    if (error) console.error('Error fetching categories', error);
    else setCategories(data);
  };

  useEffect(() => {
    if(adminRestaurantId){
        fetchMenuItems();
        fetchCategories();
    }
  }, [adminRestaurantId]);

  const handleAddItem = async () => {
    if (!newItemName || !newItemPrice) return;
    const { error } = await supabase.from('menu_items').insert([
      { name: newItemName, price: newItemPrice, restaurant_id: adminRestaurantId, category: 'Default', in_stock: true, takeaway_available: true }
    ]);
    if (error) Alert.alert('Error', error.message);
    else {
      setNewItemName('');
      setNewItemPrice('');
      fetchMenuItems();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    const { error } = await supabase.from('categories').insert([
      { name: newCategoryName, restaurant_id: adminRestaurantId }
    ]);
    if (error) Alert.alert('Error', error.message);
    else {
      setNewCategoryName('');
      fetchCategories();
    }
  };

  const handleDeleteItem = async (itemId) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) Alert.alert('Error', error.message);
    else fetchMenuItems();
  };

  const handleToggleStock = async (item) => {
    const { error } = await supabase.from('menu_items').update({ in_stock: !item.in_stock }).eq('id', item.id);
    if (error) Alert.alert('Error', error.message);
    else fetchMenuItems();
  };

  const renderMenuItem = ({ item }) => (
    <View style={styles.listItem}>
      <Text>{item.name} - ₹{item.price}</Text>
      <Text>In Stock: {item.in_stock ? 'Yes' : 'No'}</Text>
      <View style={styles.buttonContainer}>
        <Button title={item.in_stock ? 'Set Out of Stock' : 'Set In Stock'} onPress={() => handleToggleStock(item)} />
        <Button title="Delete" color="red" onPress={() => handleDeleteItem(item.id)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <TextInput placeholder="New Category Name" value={newCategoryName} onChangeText={setNewCategoryName} style={styles.input} />
        <Button title="Add Category" onPress={handleAddCategory} />
      </View>
      <View style={styles.form}>
        <TextInput placeholder="New Item Name" value={newItemName} onChangeText={setNewItemName} style={styles.input} />
        <TextInput placeholder="New Item Price" value={newItemPrice} onChangeText={setNewItemPrice} style={styles.input} keyboardType="numeric" />
        <Button title="Add Item" onPress={handleAddItem} />
      </View>
      <Text style={styles.header}>Categories</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text style={styles.listItem}>{item.name}</Text>}
      />
      <Text style={styles.header}>Menu Items</Text>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMenuItem}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  form: { marginBottom: 20 },
  input: { borderWidth: 1, borderColor: 'gray', padding: 10, marginBottom: 10 },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  listItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
});

export default MenuManagementScreen;

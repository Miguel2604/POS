'use client'

import React, { useState } from 'react';

// Main POS Layout
const POSLayout = () => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentBalance, setStudentBalance] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  
  // Sample menu data with a useState to allow modifications
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Burger', price: 5.99 },
    { id: 2, name: 'Pizza Slice', price: 3.99 },
    { id: 3, name: 'Salad Bowl', price: 4.50 },
    { id: 4, name: 'Coffee', price: 2.00 },
    { id: 5, name: 'Bottled Water', price: 1.50 },
    { id: 6, name: 'Sandwich', price: 4.99 },
    { id: 7, name: 'Fruit Cup', price: 3.50 },
    { id: 8, name: 'Tea', price: 1.75 },
  ]);

  // Add item to cart
  const addToCart = (item) => {
    // Check if item already in cart
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // Increase quantity of existing item
      const updatedCart = cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 } 
          : cartItem
      );
      setCart(updatedCart);
    } else {
      // Add new item with quantity 1
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    
    // Update total
    setTotal(prev => prev + item.price);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    const itemToRemove = cart.find(item => item.id === itemId);
    if (!itemToRemove) return;

    if (itemToRemove.quantity > 1) {
      // Decrease quantity
      const updatedCart = cart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: item.quantity - 1 } 
          : item
      );
      setCart(updatedCart);
    } else {
      // Remove item completely
      setCart(cart.filter(item => item.id !== itemId));
    }
    
    // Update total
    setTotal(prev => prev - itemToRemove.price);
  };

  // Clear the cart
  const clearCart = () => {
    setCart([]);
    setTotal(0);
  };

  // Open payment modal
  const handleCheckout = () => {
    if (cart.length > 0) {
      setShowPaymentModal(true);
    }
  };

  // Process RFID scan (simulated with input field)
  const handleIdSubmit = (e) => {
    e.preventDefault();
    // In a real app, you would query your database here
    // For now, we'll simulate a balance lookup
    setStudentBalance(50.00); // Example balance
  };

  // Process payment
  const handlePayment = () => {
    // In a real app, you would update the database
    setShowPaymentModal(false);
    setShowSuccess(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      clearCart();
      setStudentId('');
      setStudentBalance(null);
      setShowSuccess(false);
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Left Panel - Menu */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">Campus Canteen POS</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                editMode 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-gray-100 text-gray-800 border border-gray-300'
              }`}
            >
              {editMode ? 'Done Editing' : 'Edit Menu'}
            </button>
            {editMode && (
              <button 
                onClick={() => {
                  setNewItem({ name: '', price: '', category: 'Fast Food' });
                  setShowAddItemModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                Add Item
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map(item => (
            <div 
              key={item.id} 
              className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center border border-gray-100 relative"
            >
              {editMode && (
                <button
                  onClick={() => {
                    const updatedItems = menuItems.filter(menuItem => menuItem.id !== item.id);
                    setMenuItems(updatedItems);
                    
                    // Also remove from cart if present
                    const updatedCart = cart.filter(cartItem => cartItem.id !== item.id);
                    setCart(updatedCart);
                    
                    // Recalculate total if needed
                    if (cart.length !== updatedCart.length) {
                      const newTotal = updatedCart.reduce(
                        (sum, item) => sum + item.price * item.quantity, 
                        0
                      );
                      setTotal(newTotal);
                    }
                  }}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                >
                  ✕
                </button>
              )}
              <div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-gray-700 text-base">${item.price.toFixed(2)}</p>
              </div>
              {!editMode && (
                <button
                  onClick={() => addToCart(item)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Right Panel - Cart */}
      <div className="w-1/3 bg-white p-6 shadow-xl flex flex-col border-l border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-800">Current Order</h2>
        
        <div className="flex-grow overflow-y-auto mb-4">
          {cart.length === 0 ? (
            <p className="text-gray-600 text-lg italic">No items in cart</p>
          ) : (
            <ul className="divide-y">
              {cart.map(item => (
                <li key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-lg">{item.name}</span>
                    <span className="text-gray-700 ml-2 text-base">x{item.quantity}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between text-xl font-bold mb-6 pt-2">
            <span>Total:</span>
            <span className="text-blue-800">${total.toFixed(2)}</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              className="flex-1 bg-gray-200 py-3 rounded-md font-medium text-gray-800 hover:bg-gray-300 transition-colors"
              disabled={cart.length === 0}
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              className="flex-1 bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 transition-colors"
              disabled={cart.length === 0}
            >
              Pay with ID
            </button>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Student ID Payment</h2>
            
            <form onSubmit={handleIdSubmit}>
              <label className="block mb-2 text-lg font-medium">Scan Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full p-4 border-2 border-gray-300 rounded-md mb-6 text-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="Scan RFID card..."
                autoFocus
              />
              
              {!studentBalance && (
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Check Balance
                </button>
              )}
            </form>
            
            {studentBalance !== null && (
              <div className="mt-6">
                <div className="flex justify-between mb-4 text-lg">
                  <span>Available Balance:</span>
                  <span className="font-bold text-green-600">${studentBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4 text-lg">
                  <span>Order Total:</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4 text-lg border-t border-b py-3 border-gray-200">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-blue-700">${(studentBalance - total).toFixed(2)}</span>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-gray-200 py-3 rounded-md text-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    className="flex-1 bg-green-600 text-white py-3 rounded-md text-lg font-medium hover:bg-green-700 transition-colors"
                    disabled={studentBalance < total}
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-green-600 text-6xl mb-6">✓</div>
            <h2 className="text-3xl font-bold mb-4 text-blue-800">Payment Successful!</h2>
            <p className="mb-4 text-xl">Thank you for your purchase.</p>
          </div>
        </div>
      )}
      
      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Add New Menu Item</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // Create new item with a unique ID
              const id = Math.max(...menuItems.map(item => item.id), 0) + 1;
              const price = parseFloat(newItem.price);
              
              if (newItem.name.trim() === '' || isNaN(price) || price <= 0) {
                alert('Please enter a valid name and price');
                return;
              }
              
              const itemToAdd = {
                id,
                name: newItem.name.trim(),
                price
              };
              
              // Add to menu items
              setMenuItems([...menuItems, itemToAdd]);
              
              // Close modal and reset form
              setShowAddItemModal(false);
              setNewItem({ name: '', price: '' });
            }}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Enter item name"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block mb-2 font-medium">Price ($)</label>
                <input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 bg-gray-200 py-3 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSLayout;
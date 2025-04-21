/**
 * Canteen POS Application Logic
 * Updated to support vendor authentication
 * Fixed button functionality
 */

"use strict";

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing POS script with Supabase and vendor auth.");

    // --- DOM Element Selectors ---
    const ui = {
        // Buttons
        payButton: document.getElementById('pay-button'),
        clearCartButton: document.getElementById('clear-cart-button'),
        cancelPaymentButton: document.getElementById('cancel-payment-button'),
        confirmPaymentButton: document.getElementById('confirm-payment-button'),
        logoutButton: document.getElementById('logout-button'),
        menuButton: document.getElementById('menu-button'),

        // Modal Elements
        paymentModal: document.getElementById('payment-modal'),
        rfidInput: document.getElementById('rfid-input'),
        studentInfoDiv: document.getElementById('student-info'),
        studentNameSpan: document.getElementById('student-name'),
        studentBalanceSpan: document.getElementById('student-balance'),
        paymentFeedbackDiv: document.getElementById('payment-feedback'),

        // Cart Elements
        cartItemsDiv: document.getElementById('cart-items'),
        cartSubtotalSpan: document.getElementById('cart-subtotal'),
        cartTotalSpan: document.getElementById('cart-total'),
        initialCartMessage: document.querySelector('#cart-items .initial-cart-message'),

        // Product List Area
        productListDiv: document.getElementById('product-list'),

        // Message Popups
        successMessageDiv: document.getElementById('success-message'),
        errorMessageDiv: document.getElementById('error-message'),
        
        // Admin Panel Elements
        
        // Menu Management Elements
        menuModal: document.getElementById('menu-modal'),
        closeMenuButton: document.getElementById('close-menu-button'),
        exitMenuButton: document.getElementById('exit-menu-button'),
        adminProductList: document.getElementById('admin-product-list'),
        adminTransactionList: document.getElementById('admin-transaction-list'),
        adminAddProductForm: document.getElementById('admin-add-product-form'),
        
        // PIN Modal Elements
        pinModal: document.getElementById('pin-modal'),
        pinInput: document.getElementById('pin-input'),
        pinFeedback: document.getElementById('pin-feedback'),
        pinCancelButton: document.getElementById('pin-cancel-button'),
        pinConfirmButton: document.getElementById('pin-confirm-button'),
        
        // Vendor Information
        vendorNameDisplay: document.getElementById('vendor-name'),
        connectionStatus: document.getElementById('connection-status'),
        connectionText: document.getElementById('connection-text')
    };

    // --- Application State & Data ---
    let state = {
        products: [],
        students: {},
        cart: [],
        transactions: [],
        currentStudent: null,
        paymentInProgress: false,
        currentVendor: null
    };

    // --- User Authentication Functions ---
    
    async function checkAuth() {
        try {
            showLoading();
            showConnectionStatus('Checking authentication...', 'checking');
            
            const result = await window.api.auth.getSession();
            
            if (!result.session) {
                // Not authenticated, redirect to login
                window.location.href = 'login.html';
                return false;
            }
            
            // Store vendor info
            state.currentVendor = result.vendor;
            
            // Update UI with vendor name
            if (ui.vendorNameDisplay) {
                ui.vendorNameDisplay.textContent = state.currentVendor.name;
            }
            
            showConnectionStatus('Connected', 'connected');
            setTimeout(() => hideConnectionStatus(), 3000);
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            showConnectionStatus('Authentication failed', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        } finally {
            hideLoading();
        }
    }
    
    async function logout() {
        try {
            showLoading();
            await window.api.auth.logout();
            // The main process will handle redirection to login page
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed: ' + error.message, 'error');
            hideLoading();
        }
    }

    // --- Supabase Database Functions ---

    async function getAllStudents() {
        try {
            return await window.api.students.getAll();
        } catch (error) {
            console.error('Error getting students:', error);
            showNotification('Error loading students', 'error');
            return [];
        }
    }

    async function saveStudent(student) {
        try {
            await window.api.students.save(student);
            console.log('Student saved successfully:', student.uid);
        } catch (error) {
            console.error('Error saving student:', error);
            showNotification('Error saving student', 'error');
            throw error;
        }
    }

    async function getAllProducts() {
        try {
            return await window.api.products.getAll();
        } catch (error) {
            console.error('Error getting products:', error);
            showNotification('Error loading products', 'error');
            return [];
        }
    }

    async function saveProduct(product) {
        try {
            await window.api.products.save(product);
            console.log('Product saved successfully:', product.id);
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error saving product', 'error');
            throw error;
        }
    }

    async function deleteProduct(id) {
        try {
            await window.api.products.delete(id);
            console.log('Product deleted successfully:', id);
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product', 'error');
            throw error;
        }
    }

    async function getAllTransactions() {
        try {
            return await window.api.transactions.getAll();
        } catch (error) {
            console.error('Error getting transactions:', error);
            showNotification('Error loading transactions', 'error');
            return [];
        }
    }

    async function saveTransaction(transaction) {
        try {
            await window.api.transactions.save(transaction);
            console.log('Transaction saved successfully:', transaction.transactionId);
        } catch (error) {
            console.error('Error saving transaction:', error);
            showNotification('Error saving transaction', 'error');
            throw error;
        }
    }

    // --- Core Functions ---

    async function loadProducts() {
        console.log("Loading products into UI...");
        ui.productListDiv.innerHTML = '';

        try {
            // Get products from Supabase
            state.products = await getAllProducts();

            const colors = ['blue', 'green', 'yellow'];
            let colorIndex = 0;

            if (state.products.length === 0) {
                // Show a message or placeholder if no products
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'col-span-full text-center text-white p-4';
                emptyMessage.textContent = 'No products available. Use Manage Menu to add products.';
                ui.productListDiv.appendChild(emptyMessage);
                return;
            }

            state.products.forEach(product => {
                const color = colors[colorIndex % colors.length];
                colorIndex++;

                const productCard = document.createElement('div');
                productCard.className = `menu-item ${color}-item bg-gray-800 border border-${color}-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer`;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'text-white font-medium text-center';
                nameSpan.textContent = product.name;

                const priceSpan = document.createElement('span');
                priceSpan.className = `text-${color}-300 text-sm mt-1`;
                priceSpan.textContent = `₱${product.price.toFixed(2)}`;

                productCard.appendChild(nameSpan);
                productCard.appendChild(priceSpan);

                productCard.addEventListener('click', () => {
                    addToCart(product, 1);
                });

                ui.productListDiv.appendChild(productCard);
            });
        } catch (error) {
            console.error("Error loading products:", error);
            showNotification("Failed to load products", "error");
        }
    }

    function addToCart(product, quantity) {
        const existingItem = state.cart.find(item => item.productId === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            state.cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity
            });
        }
        updateCartDisplay();
    }

    async function loadStudentData() {
        console.log("Loading student data from Supabase...");
        try {
            const students = await getAllStudents();
            state.students = {};
            students.forEach(s => {
                state.students[s.uid] = { name: s.name, balance: s.balance };
            });
            console.log("Student data loaded successfully");
        } catch (error) {
            console.error("Error loading student data:", error);
            showNotification("Failed to load student data", "error");
        }
    }

    function updateCartDisplay() {
        console.log("Updating cart display...");
        ui.cartItemsDiv.innerHTML = '';

        if (state.cart.length === 0) {
            ui.cartItemsDiv.innerHTML = '<p class="text-gray-500 italic initial-cart-message">Cart is empty.</p>';
            ui.payButton.disabled = true;
            ui.clearCartButton.disabled = true;
            ui.cartSubtotalSpan.textContent = '₱0.00';
            ui.cartTotalSpan.textContent = '₱0.00';
            return;
        }

        let subtotal = 0;

        state.cart.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex justify-between items-center border-b py-2';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex-1';

            const nameQty = document.createElement('div');
            nameQty.textContent = `${item.name} x${item.quantity}`;
            nameQty.className = 'font-medium';

            const price = document.createElement('div');
            price.textContent = `₱${(item.price * item.quantity).toFixed(2)}`;
            price.className = 'text-gray-700';

            infoDiv.appendChild(nameQty);
            infoDiv.appendChild(price);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'ml-4 text-red-500 hover:text-red-700 font-bold';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                removeCartItem(index);
            });

            itemDiv.appendChild(infoDiv);
            itemDiv.appendChild(removeBtn);

            ui.cartItemsDiv.appendChild(itemDiv);

            subtotal += item.price * item.quantity;
        });

        ui.cartSubtotalSpan.textContent = `₱${subtotal.toFixed(2)}`;
        ui.cartTotalSpan.textContent = `₱${subtotal.toFixed(2)}`;

        ui.payButton.disabled = false;
        ui.clearCartButton.disabled = false;
    }

    function removeCartItem(index) {
        state.cart.splice(index, 1);
        updateCartDisplay();
    }

    // Updated to fetch student from Supabase if not found locally
    async function handleRfidScan(uid) {
        // const uid = rawUid.trim(); // Removed trim based on user feedback
        console.log(`Handling RFID scan for raw UID: "${uid}"`);
        ui.paymentFeedbackDiv.textContent = '';
        ui.paymentFeedbackDiv.classList.remove('text-red-600');
        ui.studentInfoDiv.classList.add('hidden');
        state.currentStudent = null;
        ui.confirmPaymentButton.disabled = true; // Disable confirm initially

        let student = state.students[uid];
        console.log('Local student lookup result:', student);

        if (!student) {
            console.warn('Student not found locally, attempting Supabase lookup for UID:', uid);
            try {
                showLoading(); // Show loading indicator during DB lookup
                student = await window.api.students.getByUid(uid);
                console.log('Supabase lookup result:', student);
                
                if (student) {
                    // Add fetched student to local cache
                    state.students[uid] = { name: student.name, balance: student.balance };
                    console.log('Student found in Supabase and added to local cache.');
                }
            } catch (error) {
                console.error('Error fetching student by UID from Supabase:', error);
                showNotification('Error checking student ID', 'error');
                ui.paymentFeedbackDiv.textContent = 'Error checking student ID.';
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                hideLoading();
                return; // Stop processing on error
            } finally {
                hideLoading(); // Hide loading indicator
            }
        }

        if (!student) {
            console.warn('Student not found locally or in Supabase for UID:', uid);
            ui.paymentFeedbackDiv.textContent = 'Student not found.';
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            return;
        }

        // Ensure student object has the necessary properties (might be from cache or DB)
        const studentData = state.students[uid] || student; 
        state.currentStudent = { uid, ...studentData };
        console.log('Set currentStudent:', state.currentStudent);

        ui.studentNameSpan.textContent = student.name;
        ui.studentBalanceSpan.textContent = `₱${student.balance.toFixed(2)}`;
        ui.studentInfoDiv.classList.remove('hidden');

        // Calculate cart total
        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        console.log('Cart total:', total, 'Student balance:', student.balance);

        if (state.cart.length === 0) {
            ui.paymentFeedbackDiv.textContent = 'Cart is empty. Please add items.';
            ui.paymentFeedbackDiv.classList.add('text-red-600');
        } else if (student.balance < total) {
            ui.paymentFeedbackDiv.textContent = 'Insufficient balance.';
            ui.paymentFeedbackDiv.classList.add('text-red-600');
        } else {
            ui.paymentFeedbackDiv.textContent = 'Sufficient balance. Ready to confirm payment.';
            ui.paymentFeedbackDiv.classList.remove('text-red-600');
            ui.confirmPaymentButton.disabled = false; // Enable the confirm button
        }
    }

    async function processPayment() {
        console.log("Processing payment...");
        showLoading();

        try {
            // Always perform a fresh scan using current RFID input value
            const uid = ui.rfidInput.value; // Removed trim based on user feedback

            let student = state.students[uid];
            console.log("Local student lookup during payment:", student);

            if (!uid) {
                ui.paymentFeedbackDiv.textContent = "Please enter or scan an ID.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading(); // Ensure loading is hidden
                return;
            }

            // If not found locally, try fetching from Supabase directly
            if (!student) {
                console.warn('Student not found locally during payment, attempting Supabase lookup for UID:', uid);
                try {
                    student = await window.api.students.getByUid(uid);
                    console.log('Supabase lookup result during payment:', student);
                    if (student) {
                        // Add fetched student to local cache
                        state.students[uid] = { name: student.name, balance: student.balance };
                        console.log('Student found in Supabase and added to local cache during payment.');
                    }
                } catch (error) {
                    console.error('Error fetching student by UID from Supabase during payment:', error);
                    showNotification('Error checking student ID during payment', 'error');
                    ui.paymentFeedbackDiv.textContent = 'Error checking student ID.';
                    ui.paymentFeedbackDiv.classList.add('text-red-600');
                    state.paymentInProgress = false;
                    hideLoading();
                    return; // Stop processing on error
                }
            }

            if (!student) {
                console.error("Invalid or missing student ID (checked cache and DB).");
                ui.paymentFeedbackDiv.textContent = "Invalid or missing student ID.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                return;
            }

            if (!student) {
                console.error("Invalid or missing student ID.");
                ui.paymentFeedbackDiv.textContent = "Invalid or missing student ID.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading(); // Ensure loading is hidden
                return;
            }

            // Use the potentially updated student data (from cache or DB)
            const studentData = state.students[uid] || student;
            state.currentStudent = { uid, ...studentData };

            const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            console.log("Cart total:", total);

            if (state.cart.length === 0) {
                console.warn("Cart is empty.");
                ui.paymentFeedbackDiv.textContent = "Cart is empty. Please add items.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading(); // Ensure loading is hidden
                return;
            }

            if (studentData.balance < total) {
                console.warn("Insufficient balance during payment.");
                ui.paymentFeedbackDiv.textContent = "Insufficient balance.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading(); // Ensure loading is hidden
                return;
            }

            // Deduct balance from the correct student data object
            studentData.balance -= total;
            state.currentStudent.balance = studentData.balance; // Update state.currentStudent as well

            // Persist updated student
            await saveStudent({ uid, name: studentData.name, balance: studentData.balance });
            console.log("Student balance updated in Supabase");

            // Record transaction
            const transaction = {
                transaction_id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                student_uid: uid, // Changed from studentUid to student_uid
                items: JSON.stringify(state.cart), // Stringify the cart items
                total_amount: parseFloat(total.toFixed(2)) // Changed from totalAmount to total_amount
            };
            state.transactions.push(transaction);

            // Persist transaction
            await saveTransaction(transaction);
            console.log("Transaction saved in Supabase");

            // Show success message
            showNotification("Payment successful!", "success", 3000);

            // Clear cart
            state.cart = [];
            updateCartDisplay();

            // Reset payment modal
            closePaymentModal();

            console.log("Payment processed successfully:", transaction);
            state.paymentInProgress = false; // Reset flag earlier
        } catch (error) {
            console.error("Payment error:", error);
            showNotification("Payment failed: " + error.message, "error");
            state.paymentInProgress = false; // Ensure flag is reset on error
        } finally {
            hideLoading(); // Ensure loading is hidden in all cases
        }
    }

    async function clearCart() {
        state.cart = [];
        updateCartDisplay();
    }

    // --- Utility Functions ---

    function showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function showConnectionStatus(message, type = 'info') {
        const statusDiv = ui.connectionStatus;
        const statusText = ui.connectionText;
        if (statusDiv && statusText) {
            statusText.textContent = message;
            statusDiv.className = `fixed top-2 left-2 px-3 py-1 rounded-lg text-sm ${
                type === 'connected' ? 'bg-green-600' :
                type === 'checking' ? 'bg-yellow-600' :
                'bg-red-600'
            }`;
            statusDiv.classList.remove('hidden');
        }
    }

    function hideConnectionStatus() {
        const statusDiv = ui.connectionStatus;
        if (statusDiv) {
            statusDiv.classList.add('hidden');
        }
    }

    function openPaymentModal() {
        if (ui.paymentModal) {
            ui.paymentModal.classList.remove('hidden');
            // Clear previous info and feedback
            if (ui.rfidInput) ui.rfidInput.value = '';
            if (ui.studentInfoDiv) ui.studentInfoDiv.classList.add('hidden');
            if (ui.paymentFeedbackDiv) ui.paymentFeedbackDiv.textContent = '';
            if (ui.confirmPaymentButton) ui.confirmPaymentButton.disabled = true; // Disable confirm initially
            // Auto-focus RFID input
            setTimeout(() => {
                if (ui.rfidInput) ui.rfidInput.focus();
            }, 100);
        }
    }

    function closePaymentModal() {
        if (ui.paymentModal) {
            ui.paymentModal.classList.add('hidden');
            state.paymentInProgress = false; // Ensure flag is reset
        }
    }

    function showNotification(message, type = 'success', duration = 3000) {
        const notificationDiv = type === 'success' ? ui.successMessageDiv : ui.errorMessageDiv;
        if (notificationDiv) {
            notificationDiv.textContent = message;
            notificationDiv.classList.remove('hidden');
            setTimeout(() => {
                notificationDiv.classList.add('hidden');
            }, duration);
        }
    }

    // Menu Panel Rendering
    async function renderMenuPanel() {
        console.log("Rendering menu panel");
        
        // Render transactions
        if (ui.adminTransactionList) {
            ui.adminTransactionList.innerHTML = '';
            const transactions = await getAllTransactions();
            
            if (transactions.length === 0) {
                ui.adminTransactionList.innerHTML = '<p class="text-gray-500 italic">No transactions yet.</p>';
            } else {
                transactions.forEach(tx => {
                    const div = document.createElement('div');
                    div.className = 'border p-2 rounded';

                    const formattedDate = new Date(tx.timestamp).toLocaleString();
                    
                    div.innerHTML = `<strong>${formattedDate}</strong><br>
                        Student UID: ${tx.student_uid}<br>
                        Total: ₱${tx.total_amount !== undefined ? tx.total_amount.toFixed(2) : 'N/A'}<br>
                        Items: ${typeof tx.items === 'string' ? JSON.parse(tx.items).map(i => `${i.name} x${i.quantity}`).join(', ') : 'N/A - Invalid items data'}`;

                    ui.adminTransactionList.appendChild(div);
                });
            }
        }
        
        // Render products
        if (ui.adminProductList && ui.adminAddProductForm) {
            async function renderProductList() {
                const products = await getAllProducts();
                ui.adminProductList.innerHTML = '';
                
                if (products.length === 0) {
                    ui.adminProductList.innerHTML = '<p class="text-gray-500 italic">No products yet. Add your first product above.</p>';
                    return;
                }
                
                products.forEach(product => {
                    const div = document.createElement('div');
                    div.className = 'flex justify-between items-center border p-2 rounded gap-2';

                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'flex-1 flex gap-2';

                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.value = product.name;
                    nameInput.className = 'flex-1 border border-gray-300 rounded p-1';

                    const priceInput = document.createElement('input');
                    priceInput.type = 'number';
                    priceInput.value = product.price.toFixed(2);
                    priceInput.className = 'w-24 border border-gray-300 rounded p-1 text-right';

                    infoDiv.appendChild(nameInput);
                    infoDiv.appendChild(priceInput);

                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Save';
                    saveBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm';
                    saveBtn.addEventListener('click', async () => {
                        const newName = nameInput.value.trim();
                        const newPrice = parseFloat(priceInput.value);
                        if (!newName || isNaN(newPrice) || newPrice < 0) {
                            alert('Invalid product data');
                            return;
                        }
                        try {
                            showLoading();
                            await saveProduct({ id: product.id, name: newName, price: newPrice });
                            showNotification('Product updated successfully', 'success');
                            await renderProductList();
                            await loadProducts();
                        } catch (error) {
                            console.error('Update product error:', error);
                            showNotification('Failed to update product', 'error');
                        } finally {
                            hideLoading();
                        }
                    });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm';
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm('Delete this product?')) {
                            try {
                                showLoading();
                                await deleteProduct(product.id);
                                showNotification('Product deleted successfully', 'success');
                                await renderProductList();
                                await loadProducts();
                            } catch (error) {
                                console.error('Delete product error:', error);
                                showNotification('Failed to delete product', 'error');
                            } finally {
                                hideLoading();
                            }
                        }
                    });

                    div.appendChild(infoDiv);
                    div.appendChild(saveBtn);
                    div.appendChild(deleteBtn);

                    ui.adminProductList.appendChild(div);
                });
            }

            await renderProductList();

            ui.adminAddProductForm.onsubmit = async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('admin-product-name');
                const priceInput = document.getElementById('admin-product-price');
                const name = nameInput.value.trim();
                const price = parseFloat(priceInput.value);
                
                if (!name || isNaN(price) || price < 0) {
                    showNotification('Invalid product data', 'error');
                    return;
                }
                
                try {
                    showLoading();
                    const id = 'prod_' + Date.now();
                    await saveProduct({ id, name, price });
                    showNotification('Product added successfully', 'success');
                    nameInput.value = '';
                    priceInput.value = '';
                    await renderProductList();
                    await loadProducts();
                } catch (error) {
                    console.error('Add product error:', error);
                    showNotification('Failed to add product', 'error');
                } finally {
                    hideLoading();
                }
            };
        }

        // Top Up Button - First Show PIN Modal
        const ADMIN_PIN = "1234"; // This should be stored more securely in a real app

        // Export data functionality removed as requested

        // Student search functionality
        const searchInput = document.getElementById('admin-student-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                renderAdminPanel(searchInput.value.trim().toLowerCase());
            });
        }
    } // <-- ADDED MISSING CLOSING BRACE HERE

    // --- Event Listeners ---
    function setupEventListeners() {
        console.log("Setting up event listeners...");
        
        // Pay button opens the payment modal
        if (ui.payButton) {
            ui.payButton.addEventListener('click', () => {
                console.log("Pay button clicked");
                openPaymentModal();
            });
        }
        
        // Clear cart button clears the cart
        if (ui.clearCartButton) {
            ui.clearCartButton.addEventListener('click', () => {
                console.log("Clear cart button clicked");
                clearCart();
            });
        }
        
        // Cancel payment button closes the payment modal
        if (ui.cancelPaymentButton) {
            ui.cancelPaymentButton.addEventListener('click', () => {
                console.log("Cancel payment button clicked");
                closePaymentModal();
            });
        }
        
        // Confirm payment button processes the payment
        if (ui.confirmPaymentButton) {
            ui.confirmPaymentButton.addEventListener('click', () => {
                console.log("Confirm payment button clicked");
                if (!state.paymentInProgress) {
                    state.paymentInProgress = true;
                    processPayment();
                }
            });
        }
        
        // RFID input handles the RFID scan
        if (ui.rfidInput) {
            // Listen for keydown to capture Enter key after scan
            ui.rfidInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log("Enter key pressed in RFID input");
                    const scannedId = ui.rfidInput.value;
                    // Check if the input has exactly 10 digits (assuming RFID provides 10 digits)
                    if (scannedId.length === 10) {
                        console.log("10 digits received, attempting student lookup.");
                        handleRfidScan(scannedId);
                    } else {
                        console.warn(`Input length is not 10 (${scannedId.length}). Not triggering lookup.`);
                        // Optionally provide feedback to the user if the scan was incomplete
                        ui.paymentFeedbackDiv.textContent = 'Incomplete scan. Please try again.';
                        ui.paymentFeedbackDiv.classList.add('text-red-600');
                        ui.rfidInput.value = ''; // Clear input for next scan
                    }
                }
            });
            
            // Clear feedback and student info when input changes
            ui.rfidInput.addEventListener('input', () => {
                ui.paymentFeedbackDiv.textContent = '';
                ui.paymentFeedbackDiv.classList.remove('text-red-600');
                ui.studentInfoDiv.classList.add('hidden');
                state.currentStudent = null;
                ui.confirmPaymentButton.disabled = true;
            });
        }
        
        // Logout button logs the user out
        if (ui.logoutButton) {
            ui.logoutButton.addEventListener('click', () => {
                console.log("Logout button clicked");
                logout();
            });
        }
        
        // Menu button opens the menu management modal
        if (ui.menuButton) {
            ui.menuButton.addEventListener('click', async () => {
                console.log("Menu button clicked");
                if (ui.menuModal) {
                    await renderMenuPanel();
                    ui.menuModal.classList.remove('hidden');
                }
            });
        }
        
        // Close menu button closes the menu management modal
        if (ui.closeMenuButton) {
            ui.closeMenuButton.addEventListener('click', () => {
                console.log("Close menu button clicked");
                if (ui.menuModal) {
                    ui.menuModal.classList.add('hidden');
                }
            });
        }
        
        // Exit menu button also closes the menu management modal
        if (ui.exitMenuButton) {
            ui.exitMenuButton.addEventListener('click', () => {
                console.log("Exit menu button clicked");
                if (ui.menuModal) {
                    ui.menuModal.classList.add('hidden');
                }
            });
        }
        
        // // Pin modal buttons
        // if (ui.pinCancelButton) {
        //     ui.pinCancelButton.addEventListener('click', () => {
        //         console.log("PIN cancel button clicked");
        //         if (ui.pinModal) {
        //             ui.pinModal.classList.add('hidden');
        //         }
        //     });
        // }
        
        // if (ui.pinConfirmButton) {
        //     ui.pinConfirmButton.addEventListener('click', () => {
        //         console.log("PIN confirm button clicked");
        //         // PIN confirmation logic would go here
        //     });
        // }
        
        console.log("Event listeners set up successfully");
    }
    
    // --- Initialization ---
    console.log("Initializing application data and UI...");

    async function initData() {
        try {
            // First check if user is authenticated
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return;
            
            showLoading();
            
            // Load students
            await loadStudentData();
            
            // Load transactions
            const transactions = await getAllTransactions();
            if (transactions.length === 0) {
                console.log("No transactions found in Supabase.");
            } else {
                console.log("Loaded transactions from Supabase:", transactions);
                state.transactions = transactions;
            }
            
            // Load products and render UI
            await loadProducts();
            updateCartDisplay();
            
            // Set up event listeners after data is loaded
            setupEventListeners();
            
            showNotification("System initialized successfully", "success", 2000);
        } catch (error) {
            console.error("Initialization error:", error);
            showNotification("System initialization failed. Please check your connection.", "error", 5000);
        } finally {
            hideLoading();
        }
    }
    
    // Start initialization
    initData();

    console.log("POS Application Initialized with Supabase Integration and Vendor Authentication.");
}); // End of DOMContentLoaded
/**
 * Canteen POS Application Logic
 * Updated to support vendor authentication
 * Fixed button functionality
 * Added Sales Summary Feature
 * Re-added Transaction ID to History View
 * Fixed Product Add Error (Missing ID)
 * Fixed Transaction Save Error (Missing transaction_id)
 */

"use strict";

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing POS script with Supabase, vendor auth, and sales summary.");

    // --- DOM Element Selectors ---
    const ui = {
        // Buttons
        payButton: document.getElementById('pay-button'),
        clearCartButton: document.getElementById('clear-cart-button'),
        cancelPaymentButton: document.getElementById('cancel-payment-button'),
        confirmPaymentButton: document.getElementById('confirm-payment-button'),
        logoutButton: document.getElementById('logout-button'),

        // Header Buttons
        viewTransactionsButton: document.getElementById('view-transactions-button'),
        manageMenuButton: document.getElementById('manage-menu-button'),

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

        // Receipt Modal Elements
        receiptModal: document.getElementById('receipt-modal'),
        receiptContentDiv: document.getElementById('receipt-content'),
        exportReceiptButton: document.getElementById('export-receipt-button'),
        closeReceiptButton: document.getElementById('close-receipt-button'),

        // Transaction History Modal Elements
        transactionHistoryModal: document.getElementById('transaction-history-modal'),
        closeTransactionHistoryButton: document.getElementById('close-transaction-history-button'),
        posTransactionList: document.getElementById('pos-transaction-list'),

        // Product Management Modal Elements
        productManagementModal: document.getElementById('product-management-modal'),
        closeProductManagementButton: document.getElementById('close-product-management-button'),
        adminProductList: document.getElementById('admin-product-list'),
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
        connectionText: document.getElementById('connection-text'),

        // --- NEW: Sales Summary Elements ---
        salesSummaryDisplay: document.getElementById('sales-summary-display'),
        salesSummaryDayBtn: document.getElementById('sales-summary-day-btn'),
        salesSummaryWeekBtn: document.getElementById('sales-summary-week-btn'),
        salesSummaryMonthBtn: document.getElementById('sales-summary-month-btn'),
        salesSummaryBtns: document.querySelectorAll('.sales-summary-btn'), // NodeList of all summary buttons
        // --- END NEW ---

        // Loading Overlay
        loadingOverlay: document.getElementById('loading-overlay') // Added selector for loading overlay
    };

    // --- Application State & Data ---
    let state = {
        products: [],
        students: {},
        cart: [],
        transactions: [],
        currentStudent: null,
        paymentInProgress: false,
        currentVendor: null,
        // --- NEW: Sales Summary State ---
        currentSalesPeriod: 'day' // Default to 'day'
        // --- END NEW ---
    };

    // --- User Authentication Functions ---

    async function checkAuth() {
        try {
            showLoading();
            showConnectionStatus('Checking authentication...', 'checking');

            const result = await window.api.auth.getSession();

            if (!result.session || result.role !== 'vendor') { // Ensure it's a vendor session
                // Not authenticated or not a vendor, redirect to login
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
            // Ensure product has an ID before saving (relevant for updates)
            // The main.js handler expects an ID for upsert logic.
            if (!product.id && product.id !== 0) { // Check if ID is missing or null/undefined
                 console.warn('Attempting to save product without an ID:', product);
                 // Decide how to handle: throw error, generate ID here, or rely on main.js (which currently doesn't generate it)
                 // For now, let's rely on the calling function (renderProductManagement) to provide the ID.
                 // throw new Error("Product ID is required to save.");
            }
            await window.api.products.save(product);
            console.log('Product save request sent for:', product.id || 'new product');
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error saving product', 'error');
            throw error; // Re-throw to be caught by the calling function if needed
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
            // This should return all columns including the primary key 'id'
            return await window.api.transactions.getAll();
        } catch (error) {
            console.error('Error getting transactions:', error);
            showNotification('Error loading transactions', 'error');
            return [];
        }
    }

    async function saveTransaction(transaction) {
        try {
            // Ensure transaction has a transaction_id before saving
            if (!transaction.transaction_id) {
                 console.error('Attempting to save transaction without a transaction_id:', transaction);
                 // Throw an error or handle as needed, but it shouldn't reach here if processPayment generates it.
                 throw new Error("Transaction ID is required to save.");
            }
            // The main.js handler adds vendor_id and vendor_name
            await window.api.transactions.save(transaction);
            console.log('Transaction save request sent for ID:', transaction.transaction_id);
        } catch (error) {
            console.error('Error saving transaction:', error);
            showNotification('Error saving transaction', 'error');
            throw error; // Re-throw to be caught by processPayment
        }
    }


    // --- NEW: Sales Summary Function ---
    async function fetchAndDisplaySalesSummary(period) {
        console.log(`Fetching sales summary for period: ${period}`);
        if (!ui.salesSummaryDisplay) return; // Exit if display element not found

        ui.salesSummaryDisplay.textContent = 'Loading...'; // Show loading state
        // Update active button style
        ui.salesSummaryBtns.forEach(btn => {
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        try {
            const result = await window.api.transactions.getSalesSummary(period);
            const totalSales = result.totalSales || 0;
            ui.salesSummaryDisplay.textContent = `₱${totalSales.toFixed(2)}`;
            state.currentSalesPeriod = period; // Update state
            console.log(`Sales summary updated for ${period}: ₱${totalSales.toFixed(2)}`);
        } catch (error) {
            console.error(`Error fetching sales summary for ${period}:`, error);
            ui.salesSummaryDisplay.textContent = 'Error';
            showNotification(`Failed to load ${period} sales: ${error.message}`, 'error');
        }
    }
    // --- END NEW ---


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
                // Ensure balance is stored as a number
                state.students[s.uid] = { name: s.name, balance: parseFloat(s.balance) || 0 };
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

    async function handleRfidScan(uid) {
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
                const studentDataFromDB = await window.api.students.getByUid(uid);
                console.log('Supabase lookup result:', studentDataFromDB);

                if (studentDataFromDB) {
                    // Add fetched student to local cache, ensuring balance is a number
                    student = { name: studentDataFromDB.name, balance: parseFloat(studentDataFromDB.balance) || 0 };
                    state.students[uid] = student;
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
        state.currentStudent = { uid, ...student };
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
        state.paymentInProgress = true; // Set flag at the beginning

        try {
            // Always perform a fresh scan using current RFID input value
            const uid = ui.rfidInput.value;

            if (!uid) {
                ui.paymentFeedbackDiv.textContent = "Please enter or scan an ID.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading();
                return;
            }

            let student = state.students[uid]; // Check local cache first
            console.log("Local student lookup during payment:", student);

            // If not found locally, try fetching from Supabase directly
            if (!student) {
                console.warn('Student not found locally during payment, attempting Supabase lookup for UID:', uid);
                try {
                    const studentDataFromDB = await window.api.students.getByUid(uid);
                    console.log('Supabase lookup result during payment:', studentDataFromDB);
                    if (studentDataFromDB) {
                        // Add fetched student to local cache, ensuring balance is a number
                        student = { name: studentDataFromDB.name, balance: parseFloat(studentDataFromDB.balance) || 0 };
                        state.students[uid] = student;
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
                hideLoading();
                return;
            }

            // Use the potentially updated student data
            state.currentStudent = { uid, ...student };

            const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            console.log("Cart total:", total);

            if (state.cart.length === 0) {
                console.warn("Cart is empty.");
                ui.paymentFeedbackDiv.textContent = "Cart is empty. Please add items.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading();
                return;
            }

            if (student.balance < total) {
                console.warn("Insufficient balance during payment.");
                ui.paymentFeedbackDiv.textContent = "Insufficient balance.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                state.paymentInProgress = false;
                hideLoading();
                return;
            }

            // Deduct balance
            const newBalance = student.balance - total;
            student.balance = newBalance; // Update local cache
            state.currentStudent.balance = newBalance; // Update state.currentStudent as well

            // Persist updated student balance
            await saveStudent({ uid, name: student.name, balance: newBalance });
            console.log("Student balance updated in Supabase");

            // Record transaction
            // --- FIX: Generate transaction_id ---
            // Generate a simple transaction ID if the DB doesn't auto-generate it.
            // NOTE: This is not guaranteed to be unique. UUIDs or DB sequences are better.
            const transaction_id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const transaction = {
                transaction_id: transaction_id, // Add the generated ID
                timestamp: new Date().toISOString(),
                student_uid: uid,
                items: JSON.stringify(state.cart), // Stringify the cart items
                total_amount: parseFloat(total.toFixed(2)),
                // vendor_id and vendor_name will be added by main.js handler
            };
            // --- END FIX ---

            // Persist transaction
            await saveTransaction(transaction); // Call the save function
            console.log("Transaction save request completed for ID:", transaction.transaction_id);


            // Show success message
            showNotification("Payment successful!", "success", 3000);

            // Clear cart
            state.cart = [];
            updateCartDisplay();

            // Display receipt
            // Pass details to receipt, including the generated ID
            openReceiptModal(transaction);

            // --- NEW: Refresh sales summary after successful payment ---
            await fetchAndDisplaySalesSummary(state.currentSalesPeriod);
            // --- END NEW ---

            console.log("Payment processed successfully.");

        } catch (error) {
            console.error("Payment error:", error);
            showNotification("Payment failed: " + (error.message || "Unknown error"), "error"); // Show error message
        } finally {
            state.paymentInProgress = false; // Reset flag in finally block
            hideLoading(); // Ensure loading is hidden in all cases
        }
    }


    async function clearCart() {
        state.cart = [];
        updateCartDisplay();
    }

    // --- Utility Functions ---

    function showLoading() {
        if (ui.loadingOverlay) ui.loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        if (ui.loadingOverlay) ui.loadingOverlay.classList.add('hidden');
    }

    function showConnectionStatus(message, type = 'info') {
        const statusDiv = ui.connectionStatus;
        const statusText = ui.connectionText;
        if (statusDiv && statusText) {
            statusText.textContent = message;
            statusDiv.className = `fixed top-2 left-2 px-3 py-1 rounded-lg text-sm z-40 ${ // Ensure z-index
                type === 'connected' ? 'bg-green-600 text-white' :
                type === 'checking' ? 'bg-yellow-500 text-black' :
                'bg-red-600 text-white'
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

    function openReceiptModal(receiptDetails) {
        if (ui.receiptModal && ui.receiptContentDiv) {
            // Format and display receipt details
            ui.receiptContentDiv.innerHTML = formatReceiptContent(receiptDetails);
            ui.receiptModal.classList.remove('hidden');
        }
    }

    function closeReceiptModal() {
        if (ui.receiptModal) {
            ui.receiptModal.classList.add('hidden');
            // Also close the payment modal after the receipt is viewed
            closePaymentModal();
        }
    }

    // Function for receipt formatting
    function formatReceiptContent(details) {
        // Use the generated transaction_id passed in 'details'
        let content = `<strong>Transaction ID:</strong> ${details.transaction_id || 'N/A'}<br>`;
        content += `<strong>Date:</strong> ${new Date(details.timestamp).toLocaleString()}<br>`;
        content += `<strong>Student ID:</strong> ${details.student_uid}<br>`;
        content += `<strong>Total Amount:</strong> ₱${details.total_amount.toFixed(2)}<br>`;
        content += `<strong>Items:</strong><br>`;

        try {
            const items = typeof details.items === 'string' ? JSON.parse(details.items) : details.items; // Handle already parsed items
            if (Array.isArray(items)) {
                items.forEach(item => {
                    content += `- ${item.name} x${item.quantity} (₱${(item.price * item.quantity).toFixed(2)})<br>`;
                });
            } else {
                 content += 'Item details unavailable.';
            }
        } catch (e) {
            content += 'Error loading item details.';
            console.error('Error parsing receipt items:', e, details.items);
        }

        return content;
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
            // Clear any existing timer
            if (notificationDiv.timerId) {
                clearTimeout(notificationDiv.timerId);
            }
            // Set new timer
            notificationDiv.timerId = setTimeout(() => {
                notificationDiv.classList.add('hidden');
                notificationDiv.timerId = null; // Clear timer ID
            }, duration);
        }
    }

    // Transaction History Rendering
    async function renderTransactionHistory() {
        console.log("Rendering transaction history panel");
        if (ui.posTransactionList) {
            ui.posTransactionList.innerHTML = 'Loading transactions...'; // Show loading state
            try {
                const transactions = await getAllTransactions(); // Fetches transactions for the current vendor

                if (!Array.isArray(transactions)) {
                     throw new Error("Received invalid transaction data.");
                }

                ui.posTransactionList.innerHTML = ''; // Clear loading message

                if (transactions.length === 0) {
                    ui.posTransactionList.innerHTML = '<p class="text-gray-500 italic">No transactions yet.</p>';
                } else {
                    // Sort transactions by timestamp descending (already done by main.js, but good practice)
                    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    transactions.forEach(tx => {
                        const div = document.createElement('div');
                        div.className = 'border p-3 rounded mb-2 bg-gray-50'; // Added some styling

                        const formattedDate = new Date(tx.timestamp).toLocaleString();
                        let itemsHtml = 'N/A - Invalid items data';
                        try {
                            // Ensure tx.items is a string before parsing
                            const itemsString = typeof tx.items === 'string' ? tx.items : JSON.stringify(tx.items);
                            const items = JSON.parse(itemsString);
                            if (Array.isArray(items)) {
                                itemsHtml = items.map(i => `${i.name} x${i.quantity}`).join(', ');
                            }
                        } catch (e) {
                            console.error("Error parsing items in transaction history:", e, tx.items);
                        }

                        // --- MODIFIED: Re-added the span displaying the Transaction DB ID ---
                        div.innerHTML = `
                            <div class="flex justify-between items-center mb-1">
                                <strong class="text-sm">${formattedDate}</strong>
                                <span class="text-xs text-gray-500">ID: ${tx.transaction_id || 'N/A'}</span>
                            </div>
                            <div class="text-xs text-gray-600 mb-1">Student UID: ${tx.student_uid}</div>
                            <div class="text-xs text-gray-800 mb-1">Items: ${itemsHtml}</div>
                            <div class="text-right font-bold text-gray-900">Total: ₱${tx.total_amount !== undefined ? tx.total_amount.toFixed(2) : 'N/A'}</div>
                        `;
                        // --- END MODIFICATION ---


                        ui.posTransactionList.appendChild(div);
                    });
                }
            } catch (error) {
                 console.error("Error rendering transaction history:", error);
                 ui.posTransactionList.innerHTML = '<p class="text-red-500 italic">Error loading transactions.</p>';
                 showNotification("Failed to load transaction history", "error");
            }
        }
    }


    // Product Management Rendering
    async function renderProductManagement() {
        console.log("Rendering product management panel");
        if (ui.adminProductList && ui.adminAddProductForm) {
            async function renderProductList() {
                ui.adminProductList.innerHTML = 'Loading products...'; // Loading state
                try {
                    const products = await getAllProducts();
                    ui.adminProductList.innerHTML = ''; // Clear loading

                    if (products.length === 0) {
                        ui.adminProductList.innerHTML = '<p class="text-gray-500 italic">No products yet. Add your first product above.</p>';
                        return;
                    }

                    products.forEach(product => {
                        const div = document.createElement('div');
                        div.className = 'flex justify-between items-center border p-2 rounded gap-2 mb-2 bg-gray-50'; // Added styling

                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'flex-1 flex flex-col sm:flex-row gap-2 items-center';

                        const nameInput = document.createElement('input');
                        nameInput.type = 'text';
                        nameInput.value = product.name;
                        nameInput.className = 'flex-1 border border-gray-300 rounded p-1 w-full sm:w-auto';
                        nameInput.setAttribute('aria-label', `Product name for ${product.name}`);


                        const priceInput = document.createElement('input');
                        priceInput.type = 'number';
                        priceInput.value = product.price.toFixed(2);
                        priceInput.className = 'w-24 border border-gray-300 rounded p-1 text-right';
                        priceInput.min = "0";
                        priceInput.step = "0.01";
                        priceInput.setAttribute('aria-label', `Price for ${product.name}`);


                        infoDiv.appendChild(nameInput);
                        infoDiv.appendChild(priceInput);

                        const buttonDiv = document.createElement('div');
                        buttonDiv.className = 'flex gap-2 mt-2 sm:mt-0';


                        const saveBtn = document.createElement('button');
                        saveBtn.textContent = 'Save';
                        saveBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm';
                        saveBtn.addEventListener('click', async () => {
                            const newName = nameInput.value.trim();
                            const newPrice = parseFloat(priceInput.value);
                            if (!newName || isNaN(newPrice) || newPrice < 0) {
                                showNotification('Invalid product data. Name cannot be empty and price must be a positive number.', 'error', 5000);
                                return;
                            }
                            try {
                                showLoading();
                                // Pass the existing product ID for updates
                                await saveProduct({ id: product.id, name: newName, price: newPrice });
                                showNotification('Product updated successfully', 'success');
                                await renderProductList(); // Re-render this modal list
                                await loadProducts(); // Reload products in main POS view
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
                            if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
                                try {
                                    showLoading();
                                    await deleteProduct(product.id);
                                    showNotification('Product deleted successfully', 'success');
                                    await renderProductList(); // Re-render this modal list
                                    await loadProducts(); // Reload products in main POS view
                                } catch (error) {
                                    console.error('Delete product error:', error);
                                    showNotification('Failed to delete product', 'error');
                                } finally {
                                    hideLoading();
                                }
                            }
                        });

                        buttonDiv.appendChild(saveBtn);
                        buttonDiv.appendChild(deleteBtn);

                        div.appendChild(infoDiv);
                        div.appendChild(buttonDiv);

                        ui.adminProductList.appendChild(div);
                    });
                } catch (error) {
                     console.error("Error rendering product list for management:", error);
                     ui.adminProductList.innerHTML = '<p class="text-red-500 italic">Error loading products.</p>';
                     showNotification("Failed to load products for management", "error");
                }
            }

            await renderProductList();

            // Ensure event listener is only added once or is idempotent
            if (!ui.adminAddProductForm.hasAttribute('data-listener-added')) {
                ui.adminAddProductForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const nameInput = document.getElementById('admin-product-name');
                    const priceInput = document.getElementById('admin-product-price');
                    const name = nameInput.value.trim();
                    const price = parseFloat(priceInput.value);

                    if (!name || isNaN(price) || price < 0) {
                        showNotification('Invalid product data. Name cannot be empty and price must be a positive number.', 'error', 5000);
                        return;
                    }

                    try {
                        showLoading();
                        // --- FIX: Generate an ID for new products ---
                        // Generate a simple timestamp-based ID. NOTE: This is not guaranteed to be unique.
                        // A better approach would be UUIDs or letting the database handle it if configured.
                        const id = 'prod_' + Date.now();
                        await saveProduct({ id, name, price }); // Send the generated ID
                        // --- END FIX ---

                        showNotification('Product added successfully', 'success');
                        nameInput.value = '';
                        priceInput.value = '';
                        await renderProductList(); // Re-render this modal list
                        await loadProducts(); // Reload products in main POS view
                    } catch (error) {
                        console.error('Add product error:', error);
                        showNotification('Failed to add product', 'error');
                    } finally {
                        hideLoading();
                    }
                });
                ui.adminAddProductForm.setAttribute('data-listener-added', 'true');
            }
        }
    }


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
                if (!state.paymentInProgress && !ui.confirmPaymentButton.disabled) { // Check disabled state too
                    processPayment(); // processPayment sets the flag internally
                } else {
                    console.log("Payment already in progress or button disabled.");
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
                    // Basic validation (e.g., length check) can happen here if needed
                    // if (scannedId.length === 10) { // Example validation
                        console.log("Attempting student lookup for:", scannedId);
                        handleRfidScan(scannedId);
                    // } else {
                    //     console.warn(`Input length is not 10 (${scannedId.length}). Not triggering lookup.`);
                    //     ui.paymentFeedbackDiv.textContent = 'Invalid ID length. Please scan again.';
                    //     ui.paymentFeedbackDiv.classList.add('text-red-600');
                    //     ui.rfidInput.value = ''; // Clear input for next scan
                    // }
                }
            });

            // Clear feedback and student info when input changes manually
            ui.rfidInput.addEventListener('input', () => {
                // Only clear if not triggered by the Enter key handler implicitly
                if (document.activeElement !== ui.rfidInput) return;

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

        // View Transactions button opens the transaction history modal
        if (ui.viewTransactionsButton) {
            ui.viewTransactionsButton.addEventListener('click', async () => {
                console.log("View Transactions button clicked");
                if (ui.transactionHistoryModal) {
                    ui.transactionHistoryModal.classList.remove('hidden');
                    await renderTransactionHistory(); // Render content after showing modal
                }
            });
        }

        // Manage Menu button opens the product management modal
        if (ui.manageMenuButton) {
            ui.manageMenuButton.addEventListener('click', async () => {
                console.log("Manage Menu button clicked");
                if (ui.productManagementModal) {
                    ui.productManagementModal.classList.remove('hidden');
                    await renderProductManagement(); // Render content after showing modal
                }
            });
        }

        // Close Transaction History modal button
        if (ui.closeTransactionHistoryButton) {
            ui.closeTransactionHistoryButton.addEventListener('click', () => {
                console.log("Close Transaction History button clicked");
                if (ui.transactionHistoryModal) {
                    ui.transactionHistoryModal.classList.add('hidden');
                }
            });
        }

        // Close Product Management modal button
        if (ui.closeProductManagementButton) {
            ui.closeProductManagementButton.addEventListener('click', () => {
                console.log("Close Product Management button clicked");
                if (ui.productManagementModal) {
                    ui.productManagementModal.classList.add('hidden');
                }
            });
        }

        // Receipt modal buttons
        if (ui.closeReceiptButton) {
            ui.closeReceiptButton.addEventListener('click', () => {
                console.log("Close receipt button clicked");
                closeReceiptModal();
            });
        }

        if (ui.exportReceiptButton) {
            ui.exportReceiptButton.addEventListener('click', () => {
                console.log("Export receipt button clicked");
                // TODO: Implement export functionality (e.g., print or save as text/PDF)
                showNotification("Export functionality not yet implemented.", "info");
            });
        }

        // --- NEW: Sales Summary Button Listeners ---
        if (ui.salesSummaryDayBtn) {
            ui.salesSummaryDayBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('day'));
        }
        if (ui.salesSummaryWeekBtn) {
            ui.salesSummaryWeekBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('week'));
        }
        if (ui.salesSummaryMonthBtn) {
            ui.salesSummaryMonthBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('month'));
        }
        // --- END NEW ---


        console.log("Event listeners set up successfully");

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log("Escape key pressed");
                // Close modals in reverse order of likely appearance
                if (ui.pinModal && !ui.pinModal.classList.contains('hidden')) {
                    if (ui.pinModal) ui.pinModal.classList.add('hidden');
                } else if (ui.productManagementModal && !ui.productManagementModal.classList.contains('hidden')) {
                    if (ui.productManagementModal) ui.productManagementModal.classList.add('hidden');
                } else if (ui.transactionHistoryModal && !ui.transactionHistoryModal.classList.contains('hidden')) {
                    if (ui.transactionHistoryModal) ui.transactionHistoryModal.classList.add('hidden');
                } else if (ui.receiptModal && !ui.receiptModal.classList.contains('hidden')) {
                    closeReceiptModal(); // Closes receipt and payment modal
                } else if (ui.paymentModal && !ui.paymentModal.classList.contains('hidden')) {
                    closePaymentModal();
                }
            }
        });
    }

    // --- Initialization ---
    console.log("Initializing application data and UI...");

    async function initData() {
        try {
            // First check if user is authenticated and is a vendor
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return; // Stop initialization if not authenticated

            showLoading();

            // Load essential data in parallel? Or sequentially? Sequential is safer for dependencies.
            await loadStudentData();
            // await loadInitialTransactions(); // Maybe load only recent ones initially? getAllTransactions used in modal.

            // Load products and render UI
            await loadProducts();
            updateCartDisplay();

            // --- NEW: Load initial sales summary (e.g., for today) ---
            await fetchAndDisplaySalesSummary(state.currentSalesPeriod); // Load default period
            // --- END NEW ---

            // Set up event listeners after UI elements are potentially ready
            setupEventListeners();

            showNotification("System initialized successfully", "success", 2000);
        } catch (error) {
            console.error("Initialization error:", error);
            showNotification("System initialization failed. Please check connection or contact support.", "error", 5000);
        } finally {
            hideLoading();
        }
    }

    // Start initialization
    initData();

    console.log("POS Application Initialized with Supabase Integration, Vendor Authentication, and Sales Summary.");
}); // End of DOMContentLoaded

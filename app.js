/**
 * Canteen POS Application Logic
 * Updated to support vendor authentication
 * Fixed button functionality
 * Added Sales Summary Feature
 * Re-added Transaction ID to History View
 * Fixed Product Add Error (Missing ID)
 * Fixed Transaction Save Error (Missing transaction_id)
 * Added image display to payment modal.
 */

"use strict";

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing POS script...");

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
        // *** ADDED Image Selectors ***
        modalStudentImage: document.getElementById('modal-student-image'),
        modalImagePlaceholder: document.getElementById('modal-image-placeholder'),
        // *** END ADDED ***

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

        // PIN Modal Elements (If needed)
        pinModal: document.getElementById('pin-modal'),
        pinInput: document.getElementById('pin-input'),
        pinFeedback: document.getElementById('pin-feedback'),
        pinCancelButton: document.getElementById('pin-cancel-button'),
        pinConfirmButton: document.getElementById('pin-confirm-button'),

        // Vendor Information
        vendorNameDisplay: document.getElementById('vendor-name'),
        connectionStatus: document.getElementById('connection-status'),
        connectionText: document.getElementById('connection-text'),

        // Sales Summary Elements
        salesSummaryDisplay: document.getElementById('sales-summary-display'),
        salesSummaryDayBtn: document.getElementById('sales-summary-day-btn'),
        salesSummaryWeekBtn: document.getElementById('sales-summary-week-btn'),
        salesSummaryMonthBtn: document.getElementById('sales-summary-month-btn'),
        salesSummaryBtns: document.querySelectorAll('.sales-summary-btn'),

        // Loading Overlay
        loadingOverlay: document.getElementById('loading-overlay')
    };

    // --- Application State & Data ---
    let state = {
        products: [],
        students: {}, // Cache for student data { uid: { name, balance, picture_url } }
        cart: [],
        transactions: [],
        currentStudent: null,
        paymentInProgress: false,
        currentVendor: null,
        currentSalesPeriod: 'day'
    };

    // --- User Authentication Functions ---

    async function checkAuth() {
        try {
            showLoading();
            showConnectionStatus('Checking authentication...', 'checking');

            const result = await window.api.auth.getSession();

            if (!result.session || result.role !== 'vendor') {
                window.location.href = 'login.html';
                return false;
            }
            state.currentVendor = result.vendor;
            if (ui.vendorNameDisplay) ui.vendorNameDisplay.textContent = state.currentVendor.name;
            showConnectionStatus('Connected', 'connected');
            setTimeout(() => hideConnectionStatus(), 3000);
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            showConnectionStatus('Authentication failed', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            return false;
        } finally {
            hideLoading();
        }
    }

    async function logout() {
        try {
            showLoading();
            await window.api.auth.logout();
            // Main process handles redirection
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed: ' + error.message, 'error');
            hideLoading();
        }
    }

    // --- Supabase Database Functions (Simplified - Assuming API calls work) ---

    async function getAllStudents() {
        try { return await window.api.students.getAll(); }
        catch (error) { console.error('Error getting students:', error); showNotification('Error loading students', 'error'); return []; }
    }

    async function saveStudent(student) {
        try { await window.api.students.save(student); console.log('Student saved successfully:', student.uid); }
        catch (error) { console.error('Error saving student:', error); showNotification('Error saving student', 'error'); throw error; }
    }

    async function getAllProducts() {
        try { return await window.api.products.getAll(); }
        catch (error) { console.error('Error getting products:', error); showNotification('Error loading products', 'error'); return []; }
    }

    async function saveProduct(product) {
        try { await window.api.products.save(product); console.log('Product save request sent for:', product.id || 'new product'); }
        catch (error) { console.error('Error saving product:', error); showNotification('Error saving product', 'error'); throw error; }
    }

    async function deleteProduct(id) {
        try { await window.api.products.delete(id); console.log('Product deleted successfully:', id); }
        catch (error) { console.error('Error deleting product:', error); showNotification('Error deleting product', 'error'); throw error; }
    }

    async function getAllTransactions() { // Fetches only for current vendor via main.js
        try { return await window.api.transactions.getAll(); }
        catch (error) { console.error('Error getting transactions:', error); showNotification('Error loading transactions', 'error'); return []; }
    }

    async function saveTransaction(transaction) {
        try {
            if (!transaction.transaction_id) throw new Error("Transaction ID is required to save.");
            await window.api.transactions.save(transaction);
            console.log('Transaction save request sent for ID:', transaction.transaction_id);
        } catch (error) { console.error('Error saving transaction:', error); showNotification('Error saving transaction', 'error'); throw error; }
    }

    // --- Sales Summary Function ---
    async function fetchAndDisplaySalesSummary(period) {
        console.log(`Fetching sales summary for period: ${period}`);
        if (!ui.salesSummaryDisplay) return;
        ui.salesSummaryDisplay.textContent = 'Loading...';
        ui.salesSummaryBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.period === period));
        try {
            const result = await window.api.transactions.getSalesSummary(period);
            const totalSales = result.totalSales || 0;
            ui.salesSummaryDisplay.textContent = `₱${totalSales.toFixed(2)}`;
            state.currentSalesPeriod = period;
            console.log(`Sales summary updated for ${period}: ₱${totalSales.toFixed(2)}`);
        } catch (error) {
            console.error(`Error fetching sales summary for ${period}:`, error);
            ui.salesSummaryDisplay.textContent = 'Error';
            showNotification(`Failed to load ${period} sales: ${error.message}`, 'error');
        }
    }

    // --- Core POS Functions ---

    async function loadProducts() {
        console.log("Loading products into UI...");
        ui.productListDiv.innerHTML = ''; // Clear previous
        try {
            state.products = await getAllProducts();
            if (state.products.length === 0) {
                ui.productListDiv.innerHTML = '<div class="col-span-full text-center text-white p-4">No products available. Use Manage Menu to add products.</div>';
                return;
            }
            const colors = ['blue', 'green', 'yellow'];
            state.products.forEach((product, index) => {
                const color = colors[index % colors.length];
                const productCard = document.createElement('div');
                productCard.className = `menu-item ${color}-item bg-gray-800 border border-${color}-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer`;
                productCard.innerHTML = `
                    <span class="text-white font-medium text-center">${product.name}</span>
                    <span class="text-${color}-300 text-sm mt-1">₱${product.price.toFixed(2)}</span>
                `;
                productCard.addEventListener('click', () => addToCart(product, 1));
                ui.productListDiv.appendChild(productCard);
            });
        } catch (error) { console.error("Error loading products:", error); showNotification("Failed to load products", "error"); }
    }

    function addToCart(product, quantity) {
        const existingItem = state.cart.find(item => item.productId === product.id);
        if (existingItem) { existingItem.quantity += quantity; }
        else { state.cart.push({ productId: product.id, name: product.name, price: product.price, quantity }); }
        updateCartDisplay();
    }

    async function loadStudentData() {
        console.log("Loading student data from Supabase...");
        try {
            const students = await getAllStudents();
            state.students = {}; // Reset cache
            students.forEach(s => {
                // Ensure balance is a number and include picture_url
                state.students[s.uid] = { name: s.name, balance: parseFloat(s.balance) || 0, picture_url: s.picture_url };
            });
            console.log("Student data loaded/cached successfully");
        } catch (error) { console.error("Error loading student data:", error); showNotification("Failed to load student data", "error"); }
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
            itemDiv.innerHTML = `
                <div class="flex-1">
                    <div class="font-medium">${item.name} x${item.quantity}</div>
                    <div class="text-gray-700">₱${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <button class="ml-4 text-red-500 hover:text-red-700 font-bold remove-item-btn" data-index="${index}">Remove</button>
            `;
            ui.cartItemsDiv.appendChild(itemDiv);
            subtotal += item.price * item.quantity;
        });
        // Add event listeners to remove buttons after adding them
        ui.cartItemsDiv.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', () => removeCartItem(parseInt(btn.dataset.index)));
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
        ui.modalStudentImage.classList.add('hidden');
        ui.modalImagePlaceholder.classList.add('hidden');
        ui.modalStudentImage.src = '';
        state.currentStudent = null;
        ui.confirmPaymentButton.disabled = true;

        let student = state.students[uid]; // Check cache first
        console.log('Local student lookup result:', student);

        if (!student) {
            console.warn('Student not found locally, attempting Supabase lookup for UID:', uid);
            try {
                showLoading();
                const studentDataFromDB = await window.api.students.getByUid(uid);
                console.log('Supabase lookup result:', studentDataFromDB);
                if (studentDataFromDB) {
                    student = { name: studentDataFromDB.name, balance: parseFloat(studentDataFromDB.balance) || 0, picture_url: studentDataFromDB.picture_url };
                    state.students[uid] = student; // Update cache
                    console.log('Student found in Supabase and added to local cache.');
                }
            } catch (error) {
                console.error('Error fetching student by UID from Supabase:', error);
                showNotification('Error checking student ID', 'error');
                ui.paymentFeedbackDiv.textContent = 'Error checking student ID.';
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                hideLoading();
                return;
            } finally { hideLoading(); }
        } else {
            // Refresh from cache, ensure picture_url is present
             student = state.students[uid];
        }

        if (!student) {
            console.warn('Student not found locally or in Supabase for UID:', uid);
            ui.paymentFeedbackDiv.textContent = 'Student not found.';
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            ui.modalImagePlaceholder.classList.remove('hidden'); // Show placeholder
            return;
        }

        state.currentStudent = { uid, ...student };
        console.log('Set currentStudent:', state.currentStudent);

        // Update UI Text
        ui.studentNameSpan.textContent = student.name;
        ui.studentBalanceSpan.textContent = `₱${student.balance.toFixed(2)}`;
        ui.studentInfoDiv.classList.remove('hidden');

        // Update Image Display
        if (student.picture_url) {
            ui.modalStudentImage.src = student.picture_url;
            ui.modalStudentImage.alt = `Image of ${student.name}`;
            ui.modalStudentImage.classList.remove('hidden');
            ui.modalImagePlaceholder.classList.add('hidden');
        } else {
            ui.modalStudentImage.classList.add('hidden');
            ui.modalImagePlaceholder.classList.remove('hidden'); // Show placeholder
        }

        // Check balance vs cart total
        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        console.log('Cart total:', total, 'Student balance:', student.balance);
        if (state.cart.length === 0) { ui.paymentFeedbackDiv.textContent = 'Cart is empty.'; ui.paymentFeedbackDiv.classList.add('text-red-600'); }
        else if (student.balance < total) { ui.paymentFeedbackDiv.textContent = 'Insufficient balance.'; ui.paymentFeedbackDiv.classList.add('text-red-600'); }
        else { ui.paymentFeedbackDiv.textContent = 'Sufficient balance. Ready to confirm.'; ui.paymentFeedbackDiv.classList.remove('text-red-600'); ui.confirmPaymentButton.disabled = false; }
    }

    async function processPayment() {
        console.log("Processing payment...");
        if (state.paymentInProgress) { console.warn("Payment already in progress."); return; }
        showLoading();
        state.paymentInProgress = true;

        try {
            const uid = ui.rfidInput.value.trim(); // Use current value
            if (!uid || !state.currentStudent || state.currentStudent.uid !== uid) {
                // Rescan needed if ID doesn't match current student or is empty
                ui.paymentFeedbackDiv.textContent = "Student ID mismatch or missing. Please rescan.";
                ui.paymentFeedbackDiv.classList.add('text-red-600');
                // Trigger a fresh scan/lookup based on current input
                await handleRfidScan(uid);
                // Check if scan resolved the issue
                 if (!state.currentStudent || state.currentStudent.uid !== uid || ui.confirmPaymentButton.disabled) {
                    throw new Error("Could not confirm student details for payment.");
                 }
                 // If scan was successful and button enabled, continue
            }

            // Use the confirmed student data from state
            const student = state.currentStudent;
            const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

            if (state.cart.length === 0) { throw new Error("Cart is empty."); }
            if (student.balance < total) { throw new Error("Insufficient balance."); }

            // Deduct balance
            const newBalance = student.balance - total;
            student.balance = newBalance; // Update state student
            state.students[uid].balance = newBalance; // Update cached student

            // Persist updated student balance
            await saveStudent({ uid: student.uid, name: student.name, balance: newBalance }); // Only send necessary fields for update
            console.log("Student balance updated in Supabase");

            // Record transaction
            const transaction_id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const transaction = {
                transaction_id, // Essential ID
                timestamp: new Date().toISOString(),
                student_uid: uid,
                items: JSON.stringify(state.cart), // Stringify cart items
                total_amount: parseFloat(total.toFixed(2)),
                // vendor_id and vendor_name added by main.js
            };

            await saveTransaction(transaction);
            console.log("Transaction saved successfully ID:", transaction.transaction_id);

            showNotification("Payment successful!", "success", 3000);
            state.cart = []; // Clear cart
            updateCartDisplay();
            openReceiptModal(transaction); // Show receipt
            await fetchAndDisplaySalesSummary(state.currentSalesPeriod); // Refresh sales

            console.log("Payment processed successfully.");

        } catch (error) {
            console.error("Payment error:", error);
            showNotification("Payment failed: " + (error.message || "Unknown error"), "error");
            ui.paymentFeedbackDiv.textContent = "Payment failed: " + (error.message || "Unknown error");
            ui.paymentFeedbackDiv.classList.add('text-red-600');
        } finally {
            state.paymentInProgress = false;
            hideLoading();
        }
    }

    function clearCart() {
        state.cart = [];
        updateCartDisplay();
    }

    // --- Utility Functions ---

    function showLoading() { if (ui.loadingOverlay) ui.loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (ui.loadingOverlay) ui.loadingOverlay.classList.add('hidden'); }

    function showConnectionStatus(message, type = 'info') {
        if (ui.connectionStatus && ui.connectionText) {
            ui.connectionText.textContent = message;
            ui.connectionStatus.className = `fixed top-2 left-2 px-3 py-1 rounded-lg text-sm z-40 ${type === 'connected' ? 'bg-green-600 text-white' : type === 'checking' ? 'bg-yellow-500 text-black' : 'bg-red-600 text-white'}`;
            ui.connectionStatus.classList.remove('hidden');
        }
    }
    function hideConnectionStatus() { if (ui.connectionStatus) ui.connectionStatus.classList.add('hidden'); }

    function openPaymentModal() {
        if (ui.paymentModal) {
            ui.paymentModal.classList.remove('hidden');
            if (ui.rfidInput) ui.rfidInput.value = '';
            if (ui.studentInfoDiv) ui.studentInfoDiv.classList.add('hidden');
            if (ui.paymentFeedbackDiv) ui.paymentFeedbackDiv.textContent = '';
            if (ui.confirmPaymentButton) ui.confirmPaymentButton.disabled = true;
            // Reset image display
            if (ui.modalStudentImage) { ui.modalStudentImage.src = ''; ui.modalStudentImage.classList.add('hidden'); }
            if (ui.modalImagePlaceholder) { ui.modalImagePlaceholder.classList.add('hidden'); }
            setTimeout(() => { if (ui.rfidInput) ui.rfidInput.focus(); }, 100);
        }
    }

    function closePaymentModal() {
        if (ui.paymentModal) {
            ui.paymentModal.classList.add('hidden');
            state.paymentInProgress = false;
             // Reset image display
             if (ui.modalStudentImage) { ui.modalStudentImage.src = ''; ui.modalStudentImage.classList.add('hidden'); }
             if (ui.modalImagePlaceholder) { ui.modalImagePlaceholder.classList.add('hidden'); }
        }
    }

    function openReceiptModal(receiptDetails) {
        if (ui.receiptModal && ui.receiptContentDiv) {
            ui.receiptContentDiv.innerHTML = formatReceiptContent(receiptDetails);
            ui.receiptModal.classList.remove('hidden');
        }
    }

    function closeReceiptModal() {
        if (ui.receiptModal) {
            ui.receiptModal.classList.add('hidden');
            closePaymentModal(); // Also close payment modal after receipt
        }
    }

    function formatReceiptContent(details) {
        let content = `<div class="space-y-1">`;
        content += `<div><strong>Transaction ID:</strong> ${details.transaction_id || 'N/A'}</div>`;
        content += `<div><strong>Date:</strong> ${new Date(details.timestamp).toLocaleString()}</div>`;
        content += `<div><strong>Student ID:</strong> ${details.student_uid}</div>`;
        content += `<hr class="my-2 border-gray-300">`; // Separator
        content += `<div><strong>Items:</strong></div>`;
        try {
            const items = typeof details.items === 'string' ? JSON.parse(details.items) : details.items;
            if (Array.isArray(items)) {
                items.forEach(item => {
                    content += `<div class="ml-2">- ${item.name} x${item.quantity} <span class="float-right">₱${(item.price * item.quantity).toFixed(2)}</span></div>`;
                });
            } else { content += '<div class="ml-2">Item details unavailable.</div>'; }
        } catch (e) { content += '<div class="ml-2">Error loading item details.</div>'; console.error('Error parsing receipt items:', e, details.items); }
         content += `<hr class="my-2 border-gray-300">`; // Separator
         content += `<div class="font-bold">Total Amount: <span class="float-right">₱${details.total_amount.toFixed(2)}</span></div>`;
         content += `</div>`;
        return content;
    }

    let notificationTimer;
    function showNotification(message, type = 'success', duration = 3000) {
        const notificationDiv = type === 'success' ? ui.successMessageDiv : ui.errorMessageDiv;
        if (notificationDiv) {
            notificationDiv.textContent = message;
            notificationDiv.classList.remove('hidden');
            clearTimeout(notificationTimer); // Clear previous timer
            notificationTimer = setTimeout(() => { notificationDiv.classList.add('hidden'); }, duration);
        }
    }

    // Transaction History Rendering
    async function renderTransactionHistory() {
        console.log("Rendering transaction history panel");
        if (!ui.posTransactionList) return;
        ui.posTransactionList.innerHTML = 'Loading transactions...';
        try {
            const transactions = await getAllTransactions(); // Gets only vendor's transactions
            if (!Array.isArray(transactions)) { throw new Error("Received invalid transaction data."); }
            ui.posTransactionList.innerHTML = '';
            if (transactions.length === 0) { ui.posTransactionList.innerHTML = '<p class="text-gray-500 italic">No transactions yet.</p>'; return; }

            transactions.forEach(tx => { // Assumes sorted descending by main.js
                const div = document.createElement('div');
                div.className = 'border p-3 rounded mb-2 bg-gray-50';
                const formattedDate = new Date(tx.timestamp).toLocaleString();
                let itemsHtml = 'N/A';
                try {
                    const itemsString = typeof tx.items === 'string' ? tx.items : JSON.stringify(tx.items);
                    const items = JSON.parse(itemsString);
                    if (Array.isArray(items)) { itemsHtml = items.map(i => `${i.name} x${i.quantity}`).join(', '); }
                } catch (e) { console.error("Error parsing items in transaction history:", e, tx.items); }

                div.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <strong class="text-sm">${formattedDate}</strong>
                        <span class="text-xs text-gray-500">ID: ${tx.transaction_id || 'N/A'}</span>
                    </div>
                    <div class="text-xs text-gray-600 mb-1">Student UID: ${tx.student_uid}</div>
                    <div class="text-xs text-gray-800 mb-1">Items: ${itemsHtml}</div>
                    <div class="text-right font-bold text-gray-900">Total: ₱${tx.total_amount !== undefined ? tx.total_amount.toFixed(2) : 'N/A'}</div>
                `;
                ui.posTransactionList.appendChild(div);
            });
        } catch (error) {
             console.error("Error rendering transaction history:", error);
             ui.posTransactionList.innerHTML = '<p class="text-red-500 italic">Error loading transactions.</p>';
             showNotification("Failed to load transaction history", "error");
        }
    }

    // Product Management Rendering
    async function renderProductManagement() {
        console.log("Rendering product management panel");
        if (!ui.adminProductList || !ui.adminAddProductForm) return;

        async function renderList() {
            ui.adminProductList.innerHTML = 'Loading products...';
            try {
                const products = await getAllProducts(); // Vendor's products
                ui.adminProductList.innerHTML = '';
                if (products.length === 0) { ui.adminProductList.innerHTML = '<p class="text-gray-500 italic">No products yet. Add one above.</p>'; return; }

                products.forEach(product => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col sm:flex-row justify-between items-center border p-2 rounded gap-2 mb-2 bg-gray-50';
                    div.innerHTML = `
                        <div class="flex-1 flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
                            <input type="text" value="${product.name}" class="flex-1 border border-gray-300 rounded p-1 w-full sm:w-auto product-name-input" aria-label="Product name for ${product.name}">
                            <input type="number" value="${product.price.toFixed(2)}" class="w-24 border border-gray-300 rounded p-1 text-right product-price-input" min="0" step="0.01" aria-label="Price for ${product.name}">
                        </div>
                        <div class="flex gap-2 mt-2 sm:mt-0">
                            <button class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm product-save-btn" data-id="${product.id}">Save</button>
                            <button class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm product-delete-btn" data-id="${product.id}" data-name="${product.name}">Delete</button>
                        </div>
                    `;
                    ui.adminProductList.appendChild(div);
                });

                // Add event listeners after appending
                ui.adminProductList.querySelectorAll('.product-save-btn').forEach(btn => btn.addEventListener('click', handleProductSave));
                ui.adminProductList.querySelectorAll('.product-delete-btn').forEach(btn => btn.addEventListener('click', handleProductDelete));

            } catch (error) {
                 console.error("Error rendering product list for management:", error);
                 ui.adminProductList.innerHTML = '<p class="text-red-500 italic">Error loading products.</p>';
                 showNotification("Failed to load products for management", "error");
            }
        }

        await renderList(); // Initial render

        // Add form listener (only once)
        if (!ui.adminAddProductForm.hasAttribute('data-listener-added')) {
            ui.adminAddProductForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('admin-product-name');
                const priceInput = document.getElementById('admin-product-price');
                const name = nameInput.value.trim();
                const price = parseFloat(priceInput.value);
                if (!name || isNaN(price) || price < 0) { showNotification('Invalid product data.', 'error', 5000); return; }
                try {
                    showLoading();
                    // ID generated by DB or main.js upsert logic if needed, or pass null/undefined
                    await saveProduct({ name, price }); // Let backend handle ID/vendor_id
                    showNotification('Product added successfully', 'success');
                    nameInput.value = ''; priceInput.value = '';
                    await renderList(); // Re-render list
                    await loadProducts(); // Reload POS view
                } catch (error) { console.error('Add product error:', error); showNotification('Failed to add product', 'error'); }
                finally { hideLoading(); }
            });
            ui.adminAddProductForm.setAttribute('data-listener-added', 'true');
        }
    }

    async function handleProductSave(event) {
        const button = event.target;
        const productDiv = button.parentElement.parentElement;
    
        console.log("handleProductSave called. Button:", button);
        console.log("Found productDiv:", productDiv);
    
        if (!productDiv) {
            console.error("Could not find parent product div for save button.");
            showNotification('Error: Could not find product container.', 'error', 5000);
            return; // Exit if parent div not found
        }
    
        const nameInput = productDiv.querySelector('.product-name-input');
        const priceInput = productDiv.querySelector('.product-price-input');
        const id = button.dataset.id;
    
        console.log("Found nameInput:", nameInput);
        console.log("Found priceInput:", priceInput);
        console.log("Product ID:", id);
    
    
        if (!nameInput) {
            console.error("Could not find product name input within the product div.");
            showNotification('Error: Could not find product name input.', 'error', 5000);
            return; // Exit if name input not found
        }
    
        if (!priceInput) {
            console.error("Could not find product price input within the product div.");
            showNotification('Error: Could not find product price input.', 'error', 5000);
            return; // Exit if price input not found
        }
    
        const newName = nameInput.value.trim();
        const newPrice = parseFloat(priceInput.value);
    
        if (!newName || isNaN(newPrice) || newPrice < 0) { showNotification('Invalid product data.', 'error', 5000); return; }
        try {
            showLoading();
            await saveProduct({ id: id, name: newName, price: newPrice }); // Pass ID for update
            showNotification('Product updated successfully', 'success');
            await loadProducts(); // Reload POS view
        } catch (error) { console.error('Update product error:', error); showNotification('Failed to update product', 'error'); }
        finally { hideLoading(); }
    }

    async function handleProductDelete(event) {
        const button = event.target;
        const id = button.dataset.id;
        const name = button.dataset.name;
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                showLoading();
                await deleteProduct(id);
                showNotification('Product deleted successfully', 'success');
                await renderProductManagement(); // Re-render management list
                await loadProducts(); // Reload POS view
            } catch (error) { console.error('Delete product error:', error); showNotification('Failed to delete product', 'error'); }
            finally { hideLoading(); }
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up event listeners...");
        if (ui.payButton) ui.payButton.addEventListener('click', openPaymentModal);
        if (ui.clearCartButton) ui.clearCartButton.addEventListener('click', clearCart);
        if (ui.cancelPaymentButton) ui.cancelPaymentButton.addEventListener('click', closePaymentModal);
        if (ui.confirmPaymentButton) ui.confirmPaymentButton.addEventListener('click', () => { if (!state.paymentInProgress && !ui.confirmPaymentButton.disabled) processPayment(); });
        if (ui.logoutButton) ui.logoutButton.addEventListener('click', logout);
        if (ui.viewTransactionsButton) ui.viewTransactionsButton.addEventListener('click', () => { if (ui.transactionHistoryModal) ui.transactionHistoryModal.classList.remove('hidden'); renderTransactionHistory(); });
        if (ui.manageMenuButton) ui.manageMenuButton.addEventListener('click', () => { if (ui.productManagementModal) ui.productManagementModal.classList.remove('hidden'); renderProductManagement(); });
        if (ui.closeTransactionHistoryButton) ui.closeTransactionHistoryButton.addEventListener('click', () => { if (ui.transactionHistoryModal) ui.transactionHistoryModal.classList.add('hidden'); });
        if (ui.closeProductManagementButton) ui.closeProductManagementButton.addEventListener('click', () => { if (ui.productManagementModal) ui.productManagementModal.classList.add('hidden'); });
        if (ui.closeReceiptButton) ui.closeReceiptButton.addEventListener('click', closeReceiptModal);
        if (ui.salesSummaryDayBtn) ui.salesSummaryDayBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('day'));
        if (ui.salesSummaryWeekBtn) ui.salesSummaryWeekBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('week'));
        if (ui.salesSummaryMonthBtn) ui.salesSummaryMonthBtn.addEventListener('click', () => fetchAndDisplaySalesSummary('month'));

        // RFID Input Listener
        if (ui.rfidInput) {
            ui.rfidInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const scannedId = ui.rfidInput.value.trim();
                    if (scannedId) { handleRfidScan(scannedId); }
                    else {
                         console.warn("RFID input is empty on Enter.");
                         ui.paymentFeedbackDiv.textContent = 'Please scan or enter an ID.'; ui.paymentFeedbackDiv.classList.add('text-red-600');
                         ui.studentInfoDiv.classList.add('hidden'); ui.modalStudentImage.classList.add('hidden'); ui.modalImagePlaceholder.classList.add('hidden'); ui.modalStudentImage.src = '';
                         state.currentStudent = null; ui.confirmPaymentButton.disabled = true;
                    }
                }
            });
            ui.rfidInput.addEventListener('input', () => {
                 if (document.activeElement !== ui.rfidInput || ui.rfidInput.value === '') {
                     ui.paymentFeedbackDiv.textContent = ''; ui.paymentFeedbackDiv.classList.remove('text-red-600');
                     ui.studentInfoDiv.classList.add('hidden'); state.currentStudent = null; ui.confirmPaymentButton.disabled = true;
                     ui.modalStudentImage.classList.add('hidden'); ui.modalImagePlaceholder.classList.add('hidden'); ui.modalStudentImage.src = '';
                 }
             });
        }

        // Escape Key Listener
        document.addEventListener('keydown', (e) => {
             if (e.key === 'Escape') {
                 console.log("Escape key pressed");
                 if (ui.pinModal && !ui.pinModal.classList.contains('hidden')) ui.pinModal.classList.add('hidden');
                 else if (ui.productManagementModal && !ui.productManagementModal.classList.contains('hidden')) ui.productManagementModal.classList.add('hidden');
                 else if (ui.transactionHistoryModal && !ui.transactionHistoryModal.classList.contains('hidden')) ui.transactionHistoryModal.classList.add('hidden');
                 else if (ui.receiptModal && !ui.receiptModal.classList.contains('hidden')) closeReceiptModal();
                 else if (ui.paymentModal && !ui.paymentModal.classList.contains('hidden')) closePaymentModal();
             }
         });
        console.log("Event listeners set up successfully");
    }

    // --- Initialization ---
    async function initData() {
        try {
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return;
            showLoading();
            await loadStudentData(); // Load student cache early
            await loadProducts();
            updateCartDisplay(); // Initial cart state
            await fetchAndDisplaySalesSummary(state.currentSalesPeriod); // Initial sales summary
            setupEventListeners();
            showNotification("System initialized successfully", "success", 2000);
        } catch (error) {
            console.error("Initialization error:", error);
            showNotification("System initialization failed. Please check connection.", "error", 5000);
        } finally { hideLoading(); }
    }

    // Start initialization
    initData();

    console.log("POS Application Initialized.");
}); // End of DOMContentLoaded

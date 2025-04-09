/**
 * Canteen POS Application Logic
 *
 * Handles UI interactions, data management, and payment flow.
 */

// Strict mode helps catch common coding errors
"use strict";

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing POS script.");

    // --- DOM Element Selectors ---
    // Grouping selectors for better organization
    const ui = {
        // Buttons
        payButton: document.getElementById('pay-button'),
        clearCartButton: document.getElementById('clear-cart-button'),
        cancelPaymentButton: document.getElementById('cancel-payment-button'),
        confirmPaymentButton: document.getElementById('confirm-payment-button'),

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
    };

    // --- IndexedDB Setup ---

    const dbName = 'canteenPOS';
    const dbVersion = 2; // Upgrade version
    let db = null;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                if (!db.objectStoreNames.contains('students')) {
                    db.createObjectStore('students', { keyPath: 'uid' });
                }
                if (!db.objectStoreNames.contains('transactions')) {
                    db.createObjectStore('transactions', { keyPath: 'transactionId' });
                }
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('IndexedDB initialized');
                resolve();
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    function    saveStudent(student) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            store.put(student);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    function getAllStudents() {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('students', 'readonly');
            const store = tx.objectStore('students');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function saveTransaction(txData) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');
            store.put(txData);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    function getAllTransactions() {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('transactions', 'readonly');
            const store = tx.objectStore('transactions');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function saveProduct(product) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');
            store.put(product);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    function getAllProducts() {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readonly');
            const store = tx.objectStore('products');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function deleteProduct(id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    // --- Application State & Data ---
    let state = {
        /**
         * Products available for sale.
         * - id: Unique identifier for the product.
         * - name: Display name of the product.
         * - price: Price of the product (numeric).
         * - image (optional): URL to a product image.
         */
        products: [
            { id: 'prod001', name: 'Bottled Water', price: 20.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Water' },
            { id: 'prod002', name: 'Instant Noodles', price: 35.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Noodles' },
            { id: 'prod003', name: 'Siopao (Asado)', price: 45.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Siopao' },
            { id: 'prod004', name: 'Coffee (3-in-1)', price: 15.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Coffee' },
            { id: 'prod005', name: 'Banana Chips', price: 25.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Chips' },
            { id: 'prod006', name: 'Canned Soda', price: 30.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Soda' },
            { id: 'prod007', name: 'Sandwich', price: 55.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Sandwich' },
            { id: 'prod008', name: 'Biscuit Pack', price: 18.00, image: 'https://placehold.co/100x100/e2e8f0/cbd5e0?text=Biscuit' },
        ],

        /**
         * Student accounts, keyed by their unique RFID/Student ID (UID).
         * - uid (key): The unique identifier read from the RFID card.
         * - name: Full name of the student.
         * - balance: Current account balance (numeric).
         */
        students: {
            'STUDENT12345': { name: 'Juan Dela Cruz', balance: 500.75 },
            'STUDENT67890': { name: 'Maria Clara', balance: 1250.50 },
            'STUDENTABCDE': { name: 'Jose Rizal', balance: 85.00 },
            'STUDENTFGHIJ': { name: 'Andres Bonifacio', balance: 0.00 }, // Example with zero balance
            '1122334455': { name: 'Gabriela Silang', balance: 2000.00 }, // Example with numeric UID
            '0008299626': { name: 'Sample RFID User', balance: 1000.00 }, // Added sample RFID UID
            '1234567890': { name: 'Test User 1', balance: 500.00 },
            '0987654321': { name: 'Test User 2', balance: 750.00 },
            '1111111111': { name: 'Test User 3', balance: 300.00 },
            '2222222222': { name: 'Test User 4', balance: 1200.00 }
        },

        /**
         * The current shopping cart contents.
         * - productId: The unique ID of the product added.
         * - name: Product name (copied for display consistency).
         * - quantity: How many of this item are in the cart.
         * - price: Price per item (copied at the time of adding).
         */
        cart: [], // Starts empty

        /**
         * History of completed transactions.
         * - transactionId: A unique ID for the transaction (e.g., timestamp-based).
         * - timestamp: ISO date string of when the transaction occurred.
         * - studentUid: The UID of the student who made the purchase.
         * - items: An array copy of the cart items at the time of purchase.
         * - totalAmount: The total amount paid for the transaction.
         */
        transactions: [], // Starts empty

        // Other state variables
        currentStudent: null, // Holds student data { uid, name, balance } after scan
        paymentInProgress: false, // Flag to prevent duplicate actions
    };

    // --- Core Functions (Placeholders - to be implemented in Step 3 onwards) ---

    async function loadProducts() {
        console.log("Loading products into UI...");
        ui.productListDiv.innerHTML = '';

        state.products = await getAllProducts();

        state.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'border rounded-lg p-2 flex flex-col items-center shadow hover:shadow-md transition';

            const name = document.createElement('div');
            name.className = 'font-semibold mb-1 text-center';
            name.textContent = product.name;

            const price = document.createElement('div');
            price.className = 'text-gray-700 mb-2';
            price.textContent = `₱${product.price.toFixed(2)}`;

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.min = '1';
            qtyInput.value = '1';
            qtyInput.className = 'w-16 border border-gray-300 rounded mb-2 text-center';

            const addButton = document.createElement('button');
            addButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition';
            addButton.textContent = 'Add to Cart';

            addButton.addEventListener('click', () => {
                const quantity = parseInt(qtyInput.value, 10);
                if (quantity > 0) {
                    addToCart(product, quantity);
                }
            });

            productCard.appendChild(name);
            productCard.appendChild(price);
            productCard.appendChild(qtyInput);
            productCard.appendChild(addButton);

            ui.productListDiv.appendChild(productCard);
        });
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

    function loadStudentData() {
        console.log("Placeholder: loadStudentData() called. Data is now in state.students.");
        // Step 7: Implement loading this from LocalStorage
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

    function handleRfidScan(uid) {
        console.log(`Handling RFID scan for UID: "${uid}"`);
        ui.paymentFeedbackDiv.textContent = '';
        ui.paymentFeedbackDiv.classList.remove('text-red-600');
        ui.studentInfoDiv.classList.add('hidden');
        state.currentStudent = null;

        const student = state.students[uid];
        console.log('Student lookup result:', student);

        if (!student) {
            console.warn('Student not found for UID:', uid);
            ui.paymentFeedbackDiv.textContent = 'Student not found.';
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            return;
        }

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
        }
    }

    async function processPayment() {
        console.log("Processing payment...");
        showLoading();

        try {
        // Always perform a fresh scan using current RFID input value
        const uid = ui.rfidInput.value.trim();
        console.log("Scanning UID during payment:", uid);

        const student = state.students[uid];
        console.log("Student lookup during payment:", student);

        if (!uid) {
            ui.paymentFeedbackDiv.textContent = "Please enter or scan an ID.";
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            state.paymentInProgress = false;
            return;
        }

        if (!student) {
            console.error("Invalid or missing student ID.");
            ui.paymentFeedbackDiv.textContent = "Invalid or missing student ID.";
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            state.paymentInProgress = false;
            return;
        }

        state.currentStudent = { uid, ...student };

        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        console.log("Cart total:", total);

        if (state.cart.length === 0) {
            console.warn("Cart is empty.");
            ui.paymentFeedbackDiv.textContent = "Cart is empty. Please add items.";
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            state.paymentInProgress = false;
            return;
        }

        if (student.balance < total) {
            console.warn("Insufficient balance during payment.");
            ui.paymentFeedbackDiv.textContent = "Insufficient balance.";
            ui.paymentFeedbackDiv.classList.add('text-red-600');
            state.paymentInProgress = false;
            return;
        }

        // Deduct balance
        student.balance -= total;
        state.currentStudent.balance = student.balance;

        // Persist updated student
        saveStudent({ uid, name: student.name, balance: student.balance })
            .then(() => console.log("Student balance updated in DB"))
            .catch(err => console.error("Failed to update student in DB", err));

        // Record transaction
        const transaction = {
            transactionId: Date.now().toString(),
            timestamp: new Date().toISOString(),
            studentUid: uid,
            items: JSON.parse(JSON.stringify(state.cart)),
            totalAmount: total
        };
        state.transactions.push(transaction);

        // Persist transaction
        saveTransaction(transaction)
            .then(() => console.log("Transaction saved in DB"))
            .catch(err => console.error("Failed to save transaction in DB", err));

        // Show success message
        showNotification("Payment successful!", "success", 3000);

        // Clear cart
        state.cart = [];
        updateCartDisplay();

        // Reset payment modal
        closePaymentModal();

        console.log("Payment processed successfully:", transaction);
        state.paymentInProgress = false;
        } catch (error) {
            console.error("Payment error:", error);
            showNotification("Payment failed: " + error.message, "error");
            state.paymentInProgress = false;
        } finally {
            hideLoading();
        }
    }

    function clearCart() {
        console.log("Placeholder: clearCart() called. Will clear state.cart.");
        state.cart = []; // Basic implementation
        console.log("state.cart cleared.");
        updateCartDisplay(); // Call update to refresh UI (implementation pending)
    }


    // --- UI Helper Functions ---

    function showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }


    function openPaymentModal() {
        if (!ui.paymentModal) return;
        console.log("Opening Payment modal...");
        state.paymentInProgress = false;
        ui.paymentFeedbackDiv.textContent = '';
        ui.studentInfoDiv.classList.add('hidden');
        ui.confirmPaymentButton.disabled = false;
        ui.rfidInput.value = '';
        ui.paymentModal.classList.remove('hidden');
        setTimeout(() => {
             if (ui.rfidInput) ui.rfidInput.focus();
             console.log("RFID input focused.");
        }, 100);
    }

    function closePaymentModal() {
        if (!ui.paymentModal) return;
        console.log("Closing Payment modal...");
        ui.paymentModal.classList.add('hidden');
        ui.rfidInput.value = '';
        ui.studentInfoDiv.classList.add('hidden');
        ui.paymentFeedbackDiv.textContent = '';
        ui.confirmPaymentButton.disabled = true;
        state.currentStudent = null;
        state.paymentInProgress = false;
    }

    function showNotification(message, type = 'success', duration = 3000) {
        const notificationDiv = type === 'error' ? ui.errorMessageDiv : ui.successMessageDiv;
        if (!notificationDiv) {
            console.error("Notification div not found for type:", type);
            return;
        }
        notificationDiv.textContent = message;
        notificationDiv.classList.remove('hidden');
        if (notificationDiv.timerId) {
            clearTimeout(notificationDiv.timerId);
        }
        notificationDiv.timerId = setTimeout(() => {
            notificationDiv.classList.add('hidden');
            notificationDiv.timerId = null;
        }, duration);
    }


    // --- Event Listeners ---

    // Admin Panel open/close
    const adminButton = document.getElementById('admin-button');
    const adminModal = document.getElementById('admin-modal');
    const closeAdminButton = document.getElementById('close-admin-button');
    const adminStudentList = document.getElementById('admin-student-list');
    const adminTransactionList = document.getElementById('admin-transaction-list');

    if (adminButton && adminModal && closeAdminButton) {
        adminButton.addEventListener('click', () => {
            console.log("Opening Admin Panel...");
            renderAdminPanel();
            adminModal.classList.remove('hidden');
        });

        closeAdminButton.addEventListener('click', () => {
            console.log("Closing Admin Panel...");
            adminModal.classList.add('hidden');
        });

        const exitAdminButton = document.getElementById('exit-admin-button');
        if (exitAdminButton) {
            exitAdminButton.addEventListener('click', () => {
                console.log("Exiting Admin Panel...");
                adminModal.classList.add('hidden');
            });
            const exportBtn = document.getElementById('export-data-button');
        const importInput = document.getElementById('import-data-input');

        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const students = await getAllStudents();
                const transactions = await getAllTransactions();
                const data = { students, transactions };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'canteen_pos_backup.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
            const resetDbButton = document.getElementById('reset-db-button');
        if (resetDbButton) {
            resetDbButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                    indexedDB.deleteDatabase(dbName);
                    alert('Database reset. Reloading...');
                    location.reload();
                }
            });
        }
    }

        if (importInput) {
            importInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const text = await file.text();
                try {
                    const data = JSON.parse(text);
                    if (data.students && Array.isArray(data.students)) {
                        for (const s of data.students) {
                            await saveStudent(s);
                        }
                    }
                    if (data.transactions && Array.isArray(data.transactions)) {
                        for (const t of data.transactions) {
                            await saveTransaction(t);
                        }
                    }
                    alert('Data imported successfully');
                    location.reload();
                } catch (e) {
                    console.error('Import error:', e);
                    alert('Failed to import data: ' + e.message);
                }
            });
        }
    }

        const searchInput = document.getElementById('admin-student-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                renderAdminPanel(searchInput.value.trim().toLowerCase());
            });
        }
    }

    function renderAdminPanel(filter = '') {
        // Render students
        adminStudentList.innerHTML = '';
        for (const uid in state.students) {
            const student = state.students[uid];
            const nameLower = student.name.toLowerCase();
            if (filter && !uid.toLowerCase().includes(filter) && !nameLower.includes(filter)) {
                continue;
            }

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center border p-2 rounded gap-2';

            const info = document.createElement('div');
            info.innerHTML = `<strong>${student.name}</strong><br><span class="text-sm text-gray-600">UID: ${uid}</span>`;

            const balanceDiv = document.createElement('div');
            balanceDiv.className = 'flex items-center gap-2';

            const balanceInput = document.createElement('input');
            balanceInput.type = 'number';
            balanceInput.value = student.balance.toFixed(2);
            balanceInput.className = 'w-24 border border-gray-300 rounded p-1 text-right';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm';

            saveBtn.addEventListener('click', async () => {
                const newBalance = parseFloat(balanceInput.value);
                if (isNaN(newBalance) || newBalance < 0) {
                    alert('Invalid balance amount');
                    return;
                }
                student.balance = newBalance;
                await saveStudent({ uid, name: student.name, balance: newBalance });
                alert('Balance updated');
                renderAdminPanel(filter);
            });

            balanceDiv.appendChild(balanceInput);
            balanceDiv.appendChild(saveBtn);

            div.appendChild(info);
            div.appendChild(balanceDiv);
            adminStudentList.appendChild(div);
        }

        // Render transactions
        adminTransactionList.innerHTML = '';
        if (state.transactions.length === 0) {
            adminTransactionList.innerHTML = '<p class="text-gray-500 italic">No transactions yet.</p>';
        } else {
            state.transactions.slice().reverse().forEach(tx => {
                const div = document.createElement('div');
                div.className = 'border p-2 rounded';

                div.innerHTML = `<strong>${tx.timestamp}</strong><br>
                    Student UID: ${tx.studentUid}<br>
                    Total: ₱${tx.totalAmount.toFixed(2)}<br>
                    Items: ${tx.items.map(i => `${i.name} x${i.quantity}`).join(', ')}`;

                adminTransactionList.appendChild(div);
            });
        }

        // Render products
        const productListDiv = document.getElementById('admin-product-list');
        const addProductForm = document.getElementById('admin-add-product-form');
        if (!productListDiv || !addProductForm) return;

        // Load products from DB
        async function renderProductList() {
            const products = await getAllProducts();
            productListDiv.innerHTML = '';
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
                    await saveProduct({ id: product.id, name: newName, price: newPrice });
                    alert('Product updated');
                    renderProductList();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('Delete this product?')) {
                        await deleteProduct(product.id);
                        alert('Product deleted');
                        renderProductList();
                    }
                });

                div.appendChild(infoDiv);
                div.appendChild(saveBtn);
                div.appendChild(deleteBtn);

                productListDiv.appendChild(div);
            });
        }

        // Initial render
        renderProductList();

        addProductForm.onsubmit = async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('admin-product-name');
            const priceInput = document.getElementById('admin-product-price');
            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);
            if (!name || isNaN(price) || price < 0) {
                showNotification('Invalid product data', 'error');
                return;
            }
            const id = 'prod_' + Date.now();
            try {
                await saveProduct({ id, name, price });
                showNotification('Product added successfully', 'success');
            } catch (error) {
                console.error('Add product error:', error);
                showNotification('Failed to add product', 'error');
            }
            nameInput.value = '';
            priceInput.value = '';
            await renderProductList();
            state.products = await getAllProducts();
            loadProducts();
            state.products = await getAllProducts();
            loadProducts();
            state.products = await getAllProducts();
            loadProducts();
            state.products = await getAllProducts();
            loadProducts();
        };

        // Close Admin Panel on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !adminModal.classList.contains('hidden')) {
                console.log("Closing Admin Panel via Escape key");
                adminModal.classList.add('hidden');
            }
        });
    }

    // Pay Button -> Open Modal
    if (ui.payButton) {
        ui.payButton.addEventListener('click', openPaymentModal);
    } else {
        console.error("Pay button not found!");
    }

    // Cancel Payment Button -> Close Modal
    if (ui.cancelPaymentButton) {
        ui.cancelPaymentButton.addEventListener('click', closePaymentModal);
    } else {
         console.error("Cancel Payment button not found!");
    }

    // Clear Cart Button -> Call clearCart
     if (ui.clearCartButton) {
        ui.clearCartButton.addEventListener('click', () => {
            console.log("Clear Cart button clicked.");
            clearCart(); // Call the function to clear cart data
            showNotification('Cart cleared.', 'info', 1500); // Provide feedback
        });
    } else {
        console.error("Clear Cart button not found!");
    }

    // RFID Input Field Listener (Trigger on Enter key)
    if (ui.rfidInput) {
        ui.rfidInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                const uid = ui.rfidInput.value.trim();
                if (!uid) {
                    ui.paymentFeedbackDiv.textContent = 'Please enter or scan an ID.';
                    ui.paymentFeedbackDiv.classList.add('text-red-600');
                    return;
                }
                // Temporarily disable strict 10-digit validation for testing
                console.log(`Enter key pressed in RFID input. UID: ${uid}`);
                handleRfidScan(uid);
            }
        });
        ui.rfidInput.addEventListener('input', () => { // Clear error styling on input
            if (ui.paymentFeedbackDiv.classList.contains('text-red-600')) {
                ui.paymentFeedbackDiv.textContent = '';
                ui.paymentFeedbackDiv.classList.remove('text-red-600');
            }
        });
    } else {
        console.error("RFID input field not found!");
    }

    // Confirm Payment Button -> Call processPayment (placeholder)
    if (ui.confirmPaymentButton) {
        ui.confirmPaymentButton.addEventListener('click', () => {
            if (!state.paymentInProgress) {
                state.paymentInProgress = true;
                console.log("Confirm Payment button clicked.");
                processPayment(); // Call handler (implementation pending)
            } else {
                console.warn("Payment already in progress.");
            }
        });
    } else {
        console.error("Confirm Payment button not found!");
    }


    // --- Initialization ---
    console.log("Initializing application data and UI...");

    initDB().then(async () => {
        // Load students
        const students = await getAllStudents();
        if (students.length === 0) {
            console.log("No students found in DB, saving sample students...");
            for (const uid in state.students) {
                await saveStudent({ uid, ...state.students[uid] });
            }
        } else {
            console.log("Loaded students from DB:", students);
            state.students = {};
            students.forEach(s => {
                state.students[s.uid] = { name: s.name, balance: s.balance };
            });
        }

        // Load transactions
        const transactions = await getAllTransactions();
        if (transactions.length === 0) {
            console.log("No transactions found in DB.");
        } else {
            console.log("Loaded transactions from DB:", transactions);
            state.transactions = transactions;
        }

        // Load products
        const products = await getAllProducts();
        if (products.length === 0) {
            console.log("No products found in DB, saving sample products...");
            for (const p of state.products) {
                await saveProduct(p);
            }
        } else {
            console.log("Loaded products from DB:", products);
            state.products = products;
        }

        loadProducts();
        updateCartDisplay();
    }).catch(err => {
        console.error("Failed to initialize IndexedDB:", err);
        loadProducts();
        updateCartDisplay();
    });

    console.log("POS Application Initialized and Ready.");


}); // End of DOMContentLoaded

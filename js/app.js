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

    function loadProducts() {
        console.log("Loading products into UI...");
        ui.productListDiv.innerHTML = '';

        state.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'border rounded-lg p-2 flex flex-col items-center shadow hover:shadow-md transition';

            const img = document.createElement('img');
            img.src = product.image;
            img.alt = product.name;
            img.className = 'mb-2 w-20 h-20 object-cover';

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

            productCard.appendChild(img);
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

    function processPayment() {
        console.log("Processing payment...");

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

        // Record transaction
        const transaction = {
            transactionId: Date.now().toString(),
            timestamp: new Date().toISOString(),
            studentUid: uid,
            items: JSON.parse(JSON.stringify(state.cart)),
            totalAmount: total
        };
        state.transactions.push(transaction);

        // TODO: Save updated students and transactions to LocalStorage in Step 7

        // Show success message
        showNotification("Payment successful!", "success", 3000);

        // Clear cart
        state.cart = [];
        updateCartDisplay();

        // Reset payment modal
        closePaymentModal();

        console.log("Payment processed successfully:", transaction);
        state.paymentInProgress = false;
    }

    function clearCart() {
        console.log("Placeholder: clearCart() called. Will clear state.cart.");
        state.cart = []; // Basic implementation
        console.log("state.cart cleared.");
        updateCartDisplay(); // Call update to refresh UI (implementation pending)
    }


    // --- UI Helper Functions ---

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
    }

    function renderAdminPanel() {
        // Render students
        adminStudentList.innerHTML = '';
        for (const uid in state.students) {
            const student = state.students[uid];
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center border p-2 rounded';

            const info = document.createElement('div');
            info.innerHTML = `<strong>${student.name}</strong><br><span class="text-sm text-gray-600">UID: ${uid}</span>`;

            const balance = document.createElement('div');
            balance.innerHTML = `Balance: ₱${student.balance.toFixed(2)}`;

            div.appendChild(info);
            div.appendChild(balance);
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
    // In a real app, loadStudentData() and loadProducts() might fetch from storage here.
    // For now, we use the sample data defined in state.
    loadProducts(); // Placeholder call, will render products in Step 3
    loadStudentData(); // Placeholder call
    updateCartDisplay(); // Initial call to set cart state (e.g., disable buttons)

    console.log("POS Application Initialized and Ready.");
    console.log("Sample Products:", state.products);
    console.log("Sample Students:", state.students);


}); // End of DOMContentLoaded

/**
 * Admin Dashboard JavaScript
 * Handles admin functionality for student balance management and transaction history
 * Includes image upload functionality.
 */

"use strict";

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing Admin Dashboard.");

    // --- DOM Element Selectors ---
    const ui = {
        // Admin info
        adminName: document.getElementById('admin-name'),
        logoutButton: document.getElementById('logout-button'),

        // Tabs
        tabs: document.querySelectorAll('.tab'),
        tabContents: document.querySelectorAll('.tab-content'),

        // Balance Management
        studentSearch: document.getElementById('student-search'),
        searchButton: document.getElementById('search-button'),
        studentNotFound: document.getElementById('student-not-found'),
        studentInfo: document.getElementById('student-info'),
        studentId: document.getElementById('student-id'),
        studentName: document.getElementById('student-name'),
        studentBalance: document.getElementById('student-balance'),
        topupAmount: document.getElementById('topup-amount'),
        topupButton: document.getElementById('topup-button'),
        studentTransactionsBody: document.getElementById('student-transactions-body'),
        // --- NEW: Image Elements ---
        studentImagePreview: document.getElementById('student-image-preview'),
        studentImageInput: document.getElementById('student-image-input'),
        uploadImageButton: document.getElementById('upload-image-button'),
        // --- END NEW ---

        // Transaction History
        dateFilter: document.getElementById('date-filter'),
        typeFilter: document.getElementById('type-filter'),
        transactionSearch: document.getElementById('transaction-search'),
        transactionsBody: document.getElementById('transactions-body'),
        transactionsLoading: document.getElementById('transactions-loading'),
        noTransactions: document.getElementById('no-transactions'),
        showingCount: document.getElementById('showing-count'),
        totalCount: document.getElementById('total-count'),
        prevPage: document.getElementById('prev-page'),
        nextPage: document.getElementById('next-page'),
        exportButton: document.getElementById('export-transactions-button'),

        // Notifications and Overlays
        successMessage: document.getElementById('success-message'),
        errorMessage: document.getElementById('error-message'),
        loadingOverlay: document.getElementById('loading-overlay'),
        connectionStatus: document.getElementById('connection-status'),
        connectionText: document.getElementById('connection-text')
    };

    // --- Application State ---
    let state = {
        currentAdmin: null,
        currentStudent: null,
        transactions: [],
        currentPage: 1,
        totalPages: 1,
        pageSize: 10
    };

    // --- Authentication Functions ---

    async function checkAuth() {
        try {
            showLoading();
            showConnectionStatus('Checking authentication...', 'checking');

            const result = await window.api.auth.getSession();

            if (!result.session) {
                window.location.href = 'login.html';
                return false;
            }

            try {
                const adminInfo = await window.api.admin.getInfo();

                if (!adminInfo) {
                    await window.api.auth.logout();
                    window.location.href = 'login.html';
                    return false;
                }

                state.currentAdmin = adminInfo;
                if (ui.adminName) {
                    ui.adminName.textContent = state.currentAdmin.name;
                }

                showConnectionStatus('Connected', 'connected');
                setTimeout(() => hideConnectionStatus(), 3000);

                return true;
            } catch (error) {
                console.error('Admin check failed:', error);
                showConnectionStatus('Authorization failed', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return false;
            }
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
            // Main process handles redirection
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed: ' + error.message, 'error');
            hideLoading();
        }
    }

    // --- Tab Functionality ---

    function setupTabs() {
        ui.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                ui.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                ui.tabContents.forEach(content => content.classList.add('hidden'));
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(tabId).classList.remove('hidden');

                if (tabId === 'transaction-history') {
                    loadTransactionHistory();
                }
            });
        });
    }

    // --- Student Balance Management Functions ---

    function setupBalanceManagement() {
        ui.searchButton.addEventListener('click', () => searchStudent());
        ui.studentSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchStudent();
        });
        ui.topupButton.addEventListener('click', () => topUpBalance());

        // Limit top-up amount input to 4 characters
        ui.topupAmount.addEventListener('input', (event) => {
            const input = event.target;
            if (input.value.length > 4) {
                input.value = input.value.slice(0, 4);
            }
        });

        // --- NEW: Image Upload Listeners ---
        ui.studentImageInput.addEventListener('change', handleImageFileSelection);
        ui.uploadImageButton.addEventListener('click', handleImageUpload);
        // --- END NEW ---
    }

    async function searchStudent() {
        const uid = ui.studentSearch.value.trim();
        if (!uid) return;

        showLoading();
        clearStudentInfo();

        try {
            const student = await window.api.admin.getStudentByUid(uid);

            if (!student) {
                ui.studentNotFound.classList.remove('hidden');
                return;
            }

            state.currentStudent = student;

            // Update UI with student details
            ui.studentId.textContent = student.uid;
            ui.studentName.textContent = student.name;
            ui.studentBalance.textContent = `₱${student.balance.toFixed(2)}`;

            // --- NEW: Display student image ---
            if (student.picture_url) { // Using picture_url from schema
                ui.studentImagePreview.src = student.picture_url;
                ui.studentImagePreview.alt = `Image of ${student.name}`;
                ui.studentImagePreview.classList.remove('hidden');
            } else {
                 // Show placeholder/default if no image
                ui.studentImagePreview.src = ''; // Or path to a default placeholder image
                ui.studentImagePreview.alt = 'No student image';
                ui.studentImagePreview.classList.remove('hidden'); // Keep the space consistent
            }
            ui.studentImageInput.value = null; // Clear file input
            ui.uploadImageButton.classList.add('hidden'); // Hide upload button initially
            // --- END NEW ---

            ui.studentInfo.classList.remove('hidden');
            await loadStudentTransactions(student.uid);

        } catch (error) {
            console.error('Student search error:', error);
            showNotification('Error searching for student: ' + error.message, 'error');
            ui.studentNotFound.classList.remove('hidden');
        } finally {
            hideLoading();
        }
    }

    function clearStudentInfo() {
        state.currentStudent = null;
        ui.studentNotFound.classList.add('hidden');
        ui.studentInfo.classList.add('hidden');
        ui.studentTransactionsBody.innerHTML = '';
        // --- NEW: Clear image elements ---
        ui.studentImagePreview.src = '';
        ui.studentImagePreview.classList.add('hidden');
        ui.studentImageInput.value = null;
        ui.uploadImageButton.classList.add('hidden');
        // --- END NEW ---
    }

    async function loadStudentTransactions(studentUid) {
        try {
            const transactions = await window.api.admin.getStudentTransactions(studentUid);
            ui.studentTransactionsBody.innerHTML = '';

            if (!transactions || transactions.length === 0) {
                const noTransactionsRow = `<tr><td colspan="4" class="px-4 py-4 text-sm text-center text-gray-500">No recent transactions found</td></tr>`;
                ui.studentTransactionsBody.innerHTML = noTransactionsRow;
                return;
            }

            transactions.forEach(tx => {
                const row = document.createElement('tr');
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const amount = tx.type === 'purchase' ? (tx.total_amount !== undefined ? tx.total_amount : 0) : (tx.amount !== undefined ? tx.amount : 0);
                const amountSign = tx.type === 'purchase' ? '-' : '+';
                const amountColor = tx.type === 'purchase' ? 'text-red-600' : 'text-green-600';
                const typeText = tx.type === 'purchase' ? 'Purchase' : 'Top Up';
                const typeColor = tx.type === 'purchase' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                const source = tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : (tx.admin_name || 'Admin');


                row.innerHTML = `
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${source}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${amountColor}">
                        ${amountSign}₱${amount.toFixed(2)}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColor}">
                            ${typeText}
                        </span>
                    </td>
                `;
                ui.studentTransactionsBody.appendChild(row);
            });
        } catch (error) {
            console.error('Load student transactions error:', error);
            showNotification('Error loading student transactions', 'error');
        }
    }

    async function topUpBalance() {
        if (!state.currentStudent) {
            showNotification('No student selected', 'error');
            return;
        }

        const amountStr = ui.topupAmount.value.trim();
        const amount = parseFloat(amountStr);

        if (!amountStr || isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid positive amount', 'error');
            return;
        }

        if (amount > 9999) {
            showNotification('Top-up amount cannot exceed 9999', 'error');
            return;
        }

        showLoading();

        try {
            const updatedStudent = await window.api.admin.topUpBalance(state.currentStudent.uid, amount);
            state.currentStudent = updatedStudent;
            ui.studentBalance.textContent = `₱${updatedStudent.balance.toFixed(2)}`;
            ui.topupAmount.value = '';
            showNotification(`Successfully added ₱${amount.toFixed(2)} to ${updatedStudent.name}'s balance`, 'success');
            await loadStudentTransactions(state.currentStudent.uid);
        } catch (error) {
            console.error('Top up error:', error);
            showNotification('Error adding funds: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // --- NEW: Image Handling Functions ---

    function handleImageFileSelection() {
        if (ui.studentImageInput.files && ui.studentImageInput.files[0]) {
            const file = ui.studentImageInput.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showNotification('Invalid file type. Please select a JPG, PNG, or GIF image.', 'error');
                ui.studentImageInput.value = null; // Reset input
                ui.uploadImageButton.classList.add('hidden');
                return;
            }

             if (file.size > 5 * 1024 * 1024) { // 5MB limit example
                 showNotification('File is too large. Maximum size is 5MB.', 'error');
                 ui.studentImageInput.value = null;
                 ui.uploadImageButton.classList.add('hidden');
                 return;
             }

            // Show local preview
            const reader = new FileReader();
            reader.onload = (e) => {
                ui.studentImagePreview.src = e.target.result;
                ui.studentImagePreview.classList.remove('hidden');
            }
            reader.readAsDataURL(file);

            ui.uploadImageButton.classList.remove('hidden'); // Show upload button
            ui.uploadImageButton.disabled = false;
        } else {
            ui.uploadImageButton.classList.add('hidden'); // Hide if no file selected
        }
    }

    async function handleImageUpload() {
        if (!state.currentStudent || !ui.studentImageInput.files || ui.studentImageInput.files.length === 0) {
            showNotification('Please select a student and an image file first.', 'error');
            return;
        }

        const file = ui.studentImageInput.files[0];
        const studentUid = state.currentStudent.uid;

        // Prepare file data for IPC (send path and metadata, not the raw object)
        const fileData = {
            path: file.path,
            name: file.name,
            type: file.type
        };

        showLoading();
        ui.uploadImageButton.disabled = true;
        ui.uploadImageButton.textContent = 'Uploading...';

        try {
            // Call backend to upload image, passing file metadata
            const imageUrl = await window.api.admin.uploadStudentImage(studentUid, fileData);

            // Call backend to update the student record with the new URL
            const updatedStudent = await window.api.admin.updateStudentImageUrl(studentUid, imageUrl);

            // Update UI
            state.currentStudent = updatedStudent; // Update local state
            ui.studentImagePreview.src = imageUrl; // Update preview with the final URL
            ui.studentImagePreview.classList.remove('hidden');
            ui.uploadImageButton.classList.add('hidden'); // Hide button after success
            ui.studentImageInput.value = null; // Reset file input

            showNotification('Image uploaded and updated successfully!', 'success');

        } catch (error) {
            console.error('Image upload process error:', error);
            showNotification(`Image upload failed: ${error.message}`, 'error');
            // Keep button enabled to allow retry
             ui.uploadImageButton.disabled = false;
        } finally {
            hideLoading();
            ui.uploadImageButton.textContent = 'Upload Selected Image'; // Reset button text
        }
    }
    // --- END NEW ---


    // --- Transaction History Functions ---

    function setupTransactionHistory() {
        ui.dateFilter.addEventListener('change', () => { state.currentPage = 1; loadTransactionHistory(); });
        ui.typeFilter.addEventListener('change', () => { state.currentPage = 1; loadTransactionHistory(); });
        ui.transactionSearch.addEventListener('input', debounce(() => { state.currentPage = 1; loadTransactionHistory(); }, 300));
        ui.prevPage.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; loadTransactionHistory(); } });
        ui.nextPage.addEventListener('click', () => { if (state.currentPage < state.totalPages) { state.currentPage++; loadTransactionHistory(); } });
        ui.exportButton.addEventListener('click', () => exportTransactionHistory());
    }

    async function loadTransactionHistory() {
        ui.transactionsLoading.classList.remove('hidden');
        ui.noTransactions.classList.add('hidden');
        ui.transactionsBody.innerHTML = '';

        try {
            const filters = {
                type: ui.typeFilter.value,
                searchTerm: ui.transactionSearch.value.trim()
            };

            const dateFilter = ui.dateFilter.value;
            if (dateFilter !== 'all') {
                let startDate = new Date();
                if (dateFilter === 'today') { startDate.setHours(0, 0, 0, 0); }
                else if (dateFilter === 'week') { startDate.setDate(startDate.getDate() - startDate.getDay()); startDate.setHours(0, 0, 0, 0); }
                else if (dateFilter === 'month') { startDate.setDate(1); startDate.setHours(0, 0, 0, 0); }
                filters.startDate = startDate.toISOString();
            }

            const transactions = await window.api.admin.getAllTransactions(filters);

            state.totalPages = Math.ceil(transactions.length / state.pageSize) || 1;
            if (state.currentPage > state.totalPages) state.currentPage = 1;

            const startIndex = (state.currentPage - 1) * state.pageSize;
            const endIndex = startIndex + state.pageSize;
            const pageTransactions = transactions.slice(startIndex, endIndex);

            ui.transactionsLoading.classList.add('hidden');

            if (pageTransactions.length === 0) {
                ui.noTransactions.classList.remove('hidden');
                ui.showingCount.textContent = '0';
                ui.totalCount.textContent = '0';
                ui.prevPage.disabled = true;
                ui.nextPage.disabled = true;
                return;
            }

            pageTransactions.forEach(tx => {
                const row = document.createElement('tr');
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const amount = tx.type === 'purchase' ? (tx.total_amount !== undefined ? tx.total_amount : 0) : (tx.amount !== undefined ? tx.amount : 0);
                const amountSign = tx.type === 'purchase' ? '-' : '+';
                const amountColor = tx.type === 'purchase' ? 'text-red-600' : 'text-green-600';
                const typeText = tx.type === 'purchase' ? 'Purchase' : 'Top Up';
                const typeColor = tx.type === 'purchase' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                const source = tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : (tx.admin_name || 'Admin');
                const studentName = tx.student_name || 'Unknown'; // Use joined name

                row.innerHTML = `
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${tx.student_uid}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${studentName}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${source}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${amountColor}">
                        ${amountSign}₱${amount.toFixed(2)}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColor}">
                            ${typeText}
                        </span>
                    </td>
                `;
                ui.transactionsBody.appendChild(row);
            });

            ui.showingCount.textContent = pageTransactions.length;
            ui.totalCount.textContent = transactions.length;
            ui.prevPage.disabled = state.currentPage === 1;
            ui.nextPage.disabled = state.currentPage === state.totalPages;
        } catch (error) {
            console.error('Load transactions error:', error);
            showNotification('Error loading transaction history', 'error');
            ui.transactionsLoading.classList.add('hidden');
            ui.noTransactions.classList.remove('hidden');
        }
    }

    async function exportTransactionHistory() {
        showLoading();
        try {
            const filters = {
                type: ui.typeFilter.value,
                searchTerm: ui.transactionSearch.value.trim()
            };

            const dateFilter = ui.dateFilter.value;
            if (dateFilter !== 'all') {
                let startDate = new Date();
                if (dateFilter === 'today') { startDate.setHours(0, 0, 0, 0); }
                else if (dateFilter === 'week') { startDate.setDate(startDate.getDate() - startDate.getDay()); startDate.setHours(0, 0, 0, 0); }
                else if (dateFilter === 'month') { startDate.setDate(1); startDate.setHours(0, 0, 0, 0); }
                filters.startDate = startDate.toISOString();
            }

            const transactionsToExport = await window.api.admin.getAllTransactions(filters);

            if (!transactionsToExport || transactionsToExport.length === 0) {
                showNotification('No transactions found to export with the current filters.', 'info');
                return;
            }

            const csvHeader = ["Date", "Student ID", "Student Name", "Source", "Amount", "Type"];
            const csvRows = transactionsToExport.map(tx => {
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const amountVal = tx.type === 'purchase' ? (tx.total_amount !== undefined ? -tx.total_amount : 0) : (tx.amount !== undefined ? tx.amount : 0);
                const source = tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : (tx.admin_name || 'Admin');
                const type = tx.type === 'purchase' ? 'Purchase' : 'Top Up';
                const studentName = tx.student_name || 'Unknown';

                // Escape commas within fields by enclosing in double quotes
                return [
                    `"${formattedDate}"`,
                    `"${tx.student_uid}"`,
                    `"${studentName.replace(/"/g, '""')}"`, // Escape double quotes inside name
                    `"${source.replace(/"/g, '""')}"`,
                    amountVal.toFixed(2),
                    `"${type}"`
                ].join(',');
            });

            const csvContent = [csvHeader.join(','), ...csvRows].join('\n');
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up blob URL

            showNotification('Transaction history exported successfully.', 'success');

        } catch (error) {
            console.error('Export transactions error:', error);
            showNotification('Error exporting transaction history: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // --- Utility Functions ---

    function showLoading() { if (ui.loadingOverlay) ui.loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (ui.loadingOverlay) ui.loadingOverlay.classList.add('hidden'); }

    function showConnectionStatus(message, type = 'info') {
        if (ui.connectionStatus && ui.connectionText) {
            ui.connectionText.textContent = message;
            ui.connectionStatus.className = `fixed top-2 right-2 px-3 py-1 rounded-lg text-sm z-50 ${
                type === 'connected' ? 'bg-green-600' : type === 'checking' ? 'bg-yellow-600' : 'bg-red-600'
            } text-white`;
            ui.connectionStatus.classList.remove('hidden');
        }
    }
    function hideConnectionStatus() { if (ui.connectionStatus) ui.connectionStatus.classList.add('hidden'); }

    let notificationTimeout;
    function showNotification(message, type = 'success', duration = 3000) {
        const notificationDiv = type === 'success' ? ui.successMessage : ui.errorMessage;
        if (notificationDiv) {
             if(notificationTimeout) clearTimeout(notificationTimeout); // Clear existing timer
            notificationDiv.textContent = message;
            notificationDiv.classList.remove('hidden');
            notificationTimeout = setTimeout(() => {
                notificationDiv.classList.add('hidden');
                notificationTimeout = null;
            }, duration);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Initialization ---
    console.log("Initializing admin dashboard...");

    async function init() {
        try {
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return;
            showLoading();
            setupTabs();
            setupBalanceManagement();
            setupTransactionHistory();
            ui.logoutButton.addEventListener('click', logout);
            ui.studentSearch.focus();
            showNotification("Admin dashboard initialized successfully", "success");
        } catch (error) {
            console.error("Initialization error:", error);
            showNotification("System initialization failed. Please check connection.", "error", 5000);
        } finally {
            hideLoading();
        }
    }

    init();
    console.log("Admin Dashboard Initialization Complete");
});
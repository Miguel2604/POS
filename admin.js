/**
 * Admin Dashboard JavaScript
 * Handles admin functionality for student balance management and transaction history
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
        
        // Kiosk Mode
        kioskStudentId: document.getElementById('kiosk-student-id'),
        kioskCheckButton: document.getElementById('kiosk-check-button'),
        kioskResult: document.getElementById('kiosk-result'),
        kioskStudentIdDisplay: document.getElementById('kiosk-student-id-display'),
        kioskStudentName: document.getElementById('kiosk-student-name'),
        kioskStudentBalance: document.getElementById('kiosk-student-balance'),
        kioskNotFound: document.getElementById('kiosk-not-found'),
        
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
        exportButton: document.getElementById('export-transactions-button'), // Added export button
        
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
                // Not authenticated, redirect to login
                window.location.href = 'login.html';
                return false;
            }
            
            // Check if user is an admin
            try {
                const adminInfo = await window.api.admin.getInfo();
                
                if (!adminInfo) {
                    // Not an admin, redirect to login
                    await window.api.auth.logout();
                    window.location.href = 'login.html';
                    return false;
                }
                
                // Store admin info
                state.currentAdmin = adminInfo;
                
                // Update UI with admin name
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
            // The main process will handle redirection to login page
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
                // Remove active class from all tabs
                ui.tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to the clicked tab
                tab.classList.add('active');
                
                // Hide all tab contents
                ui.tabContents.forEach(content => content.classList.add('hidden'));
                
                // Show the corresponding tab content
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(tabId).classList.remove('hidden');
                
                // Load data for specific tabs
                if (tabId === 'transaction-history') {
                    loadTransactionHistory();
                }
            });
        });
    }

    // --- Student Balance Management Functions ---
    
    function setupBalanceManagement() {
        // Search button
        ui.searchButton.addEventListener('click', () => searchStudent());
        
        // Enter key in search field
        ui.studentSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchStudent();
            }
        });
        
        // Top-up button
        ui.topupButton.addEventListener('click', () => topUpBalance());
    }
    
    async function searchStudent() {
        const uid = ui.studentSearch.value.trim();
        
        if (!uid) {
            return;
        }
        
        showLoading();
        clearStudentInfo();
        
        try {
            const student = await window.api.admin.getStudentByUid(uid);
            
            if (!student) {
                ui.studentNotFound.classList.remove('hidden');
                return;
            }
            
            // Store current student
            state.currentStudent = student;
            
            // Update UI
            ui.studentId.textContent = student.uid;
            ui.studentName.textContent = student.name;
            ui.studentBalance.textContent = `₱${student.balance.toFixed(2)}`;
            
            // Show student info
            ui.studentInfo.classList.remove('hidden');
            
            // Load student transactions
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
    }
    
    async function loadStudentTransactions(studentUid) {
        try {
            const transactions = await window.api.admin.getStudentTransactions(studentUid);
            
            // Clear previous transactions
            ui.studentTransactionsBody.innerHTML = '';
            
            if (!transactions || transactions.length === 0) {
                const noTransactionsRow = document.createElement('tr');
                noTransactionsRow.innerHTML = `
                    <td colspan="4" class="px-4 py-4 text-sm text-center text-gray-500">No recent transactions found</td>
                `;
                ui.studentTransactionsBody.appendChild(noTransactionsRow);
                return;
            }
            
            // Add transactions to the table
            transactions.forEach(tx => {
                const row = document.createElement('tr');
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                row.innerHTML = `
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : 'Admin'}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'}">
                        ${tx.type === 'purchase' ? '-' : '+'}₱${tx.type === 'purchase' ? tx.total_amount.toFixed(2) : tx.amount.toFixed(2)}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'purchase' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                            ${tx.type === 'purchase' ? 'Purchase' : 'Top Up'}
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
            showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        showLoading();
        
        try {
            const updatedStudent = await window.api.admin.topUpBalance(state.currentStudent.uid, amount);
            
            // Update state and UI
            state.currentStudent = updatedStudent;
            ui.studentBalance.textContent = `₱${updatedStudent.balance.toFixed(2)}`;
            ui.topupAmount.value = '';
            
            // Show success notification
            showNotification(`Successfully added ₱${amount.toFixed(2)} to ${updatedStudent.name}'s balance`, 'success');
            
            // Reload student transactions
            await loadStudentTransactions(state.currentStudent.uid);
        } catch (error) {
            console.error('Top up error:', error);
            showNotification('Error adding funds: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // --- Kiosk Mode Functions ---
    
    function setupKioskMode() {
        // Check button
        ui.kioskCheckButton.addEventListener('click', () => checkKioskStudent());
        
        // Enter key in kiosk field
        ui.kioskStudentId.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                checkKioskStudent();
            }
        });
    }
    
    async function checkKioskStudent() {
        const uid = ui.kioskStudentId.value.trim();
        
        if (!uid) {
            return;
        }
        
        showLoading();
        clearKioskInfo();
        
        try {
            const student = await window.api.admin.getStudentByUid(uid);
            
            if (!student) {
                ui.kioskNotFound.classList.remove('hidden');
                return;
            }
            
            // Update UI
            ui.kioskStudentIdDisplay.textContent = student.uid;
            ui.kioskStudentName.textContent = student.name;
            ui.kioskStudentBalance.textContent = `₱${student.balance.toFixed(2)}`;
            
            // Show result
            ui.kioskResult.classList.remove('hidden');
            
            // Clear input
            ui.kioskStudentId.value = '';
            
            // Auto-hide after 10 seconds for privacy
            setTimeout(() => {
                clearKioskInfo();
            }, 10000);
        } catch (error) {
            console.error('Kiosk student check error:', error);
            ui.kioskNotFound.classList.remove('hidden');
        } finally {
            hideLoading();
        }
    }
    
    function clearKioskInfo() {
        ui.kioskResult.classList.add('hidden');
        ui.kioskNotFound.classList.add('hidden');
    }

    // --- Transaction History Functions ---
    
    function setupTransactionHistory() {
        // Filter changes
        ui.dateFilter.addEventListener('change', () => {
            state.currentPage = 1;
            loadTransactionHistory();
        });
        
        ui.typeFilter.addEventListener('change', () => {
            state.currentPage = 1;
            loadTransactionHistory();
        });
        
        ui.transactionSearch.addEventListener('input', debounce(() => {
            state.currentPage = 1;
            loadTransactionHistory();
        }, 300));
        
        // Pagination
        ui.prevPage.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                loadTransactionHistory();
            }
        });
        
        ui.nextPage.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                loadTransactionHistory();
            }
         });
         
         // Export button
         ui.exportButton.addEventListener('click', () => exportTransactionHistory());
     }
     
     async function loadTransactionHistory() {
        ui.transactionsLoading.classList.remove('hidden');
        ui.noTransactions.classList.add('hidden');
        ui.transactionsBody.innerHTML = '';
        
        try {
            // Build filters
            const filters = {
                type: ui.typeFilter.value,
                searchTerm: ui.transactionSearch.value.trim()
            };
            
            // Add date filter if selected
            const dateFilter = ui.dateFilter.value;
            if (dateFilter !== 'all') {
                let startDate = new Date();
                
                if (dateFilter === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateFilter === 'week') {
                    startDate.setDate(startDate.getDate() - startDate.getDay());
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateFilter === 'month') {
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                }
                
                filters.startDate = startDate.toISOString();
            }
            
            // Get transactions with filters
            const transactions = await window.api.admin.getAllTransactions(filters);
            
            // Update pagination
            state.totalPages = Math.ceil(transactions.length / state.pageSize) || 1;
            if (state.currentPage > state.totalPages) {
                state.currentPage = 1;
            }
            
            // Get current page of transactions
            const startIndex = (state.currentPage - 1) * state.pageSize;
            const endIndex = startIndex + state.pageSize;
            const pageTransactions = transactions.slice(startIndex, endIndex);
            
            // Hide loading indicator
            ui.transactionsLoading.classList.add('hidden');
            
            if (pageTransactions.length === 0) {
                ui.noTransactions.classList.remove('hidden');
                ui.showingCount.textContent = '0';
                ui.totalCount.textContent = '0';
                ui.prevPage.disabled = true;
                ui.nextPage.disabled = true;
                return;
            }
            
            // Add transactions to the table
            pageTransactions.forEach(tx => {
                const row = document.createElement('tr');
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                row.innerHTML = `
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${tx.student_uid}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${tx.student_name || 'Unknown'}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : (tx.admin_name || 'Admin')}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'}">
                        ${tx.type === 'purchase' ? '-' : '+'}₱${tx.type === 'purchase' ? tx.total_amount.toFixed(2) : tx.amount.toFixed(2)}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'purchase' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                            ${tx.type === 'purchase' ? 'Purchase' : 'Top Up'}
                        </span>
                    </td>
                `;
                
                ui.transactionsBody.appendChild(row);
            });
            
            // Update pagination info
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
            // Get current filters
            const filters = {
                type: ui.typeFilter.value,
                searchTerm: ui.transactionSearch.value.trim()
            };

            const dateFilter = ui.dateFilter.value;
            if (dateFilter !== 'all') {
                let startDate = new Date();

                if (dateFilter === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateFilter === 'week') {
                    startDate.setDate(startDate.getDate() - startDate.getDay());
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateFilter === 'month') {
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                }

                filters.startDate = startDate.toISOString();
            }

            // Fetch all transactions based on current filters (no pagination for export)
            const transactionsToExport = await window.api.admin.getAllTransactions(filters);

            if (!transactionsToExport || transactionsToExport.length === 0) {
                showNotification('No transactions found to export with the current filters.', 'info');
                return;
            }

            // Format data as CSV
            const csvHeader = ["Date", "Student ID", "Student Name", "Source", "Amount", "Type"];
            const csvRows = transactionsToExport.map(tx => {
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const amount = tx.type === 'purchase' ? -tx.total_amount : tx.amount;
                const source = tx.type === 'purchase' ? (tx.vendor_name || 'Canteen') : (tx.admin_name || 'Admin');
                const type = tx.type === 'purchase' ? 'Purchase' : 'Top Up';

                return [
                    `"${formattedDate}"`,
                    `"${tx.student_uid}"`,
                    `"${tx.student_name || 'Unknown'}"`,
                    `"${source}"`,
                    amount.toFixed(2),
                    `"${type}"`
                ].join(',');
            });

            const csvContent = [csvHeader.join(','), ...csvRows].join('\n');

            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', 'transaction_history.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification('Transaction history exported successfully.', 'success');

        } catch (error) {
            console.error('Export transactions error:', error);
            showNotification('Error exporting transaction history: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // --- Utility Functions ---
    
    function showLoading() {
        if (ui.loadingOverlay) ui.loadingOverlay.classList.remove('hidden');
    }
    
    function hideLoading() {
        if (ui.loadingOverlay) ui.loadingOverlay.classList.add('hidden');
    }
    
    function showConnectionStatus(message, type = 'info') {
        if (ui.connectionStatus && ui.connectionText) {
            ui.connectionText.textContent = message;
            ui.connectionStatus.className = `fixed top-2 right-2 px-3 py-1 rounded-lg text-sm ${
                type === 'connected' ? 'bg-green-600' :
                type === 'checking' ? 'bg-yellow-600' :
                'bg-red-600'
            } text-white`;
            ui.connectionStatus.classList.remove('hidden');
        }
    }
    
    function hideConnectionStatus() {
        if (ui.connectionStatus) {
            ui.connectionStatus.classList.add('hidden');
        }
    }
    
    function showNotification(message, type = 'success') {
        const notificationDiv = type === 'success' ? ui.successMessage : ui.errorMessage;
        if (notificationDiv) {
            notificationDiv.textContent = message;
            notificationDiv.classList.remove('hidden');
            setTimeout(() => {
                notificationDiv.classList.add('hidden');
            }, 3000);
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Initialization ---
    console.log("Initializing admin dashboard...");

    async function init() {
        try {
            // First check if user is authenticated as admin
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) return;
            
            showLoading();
            
            // Set up event listeners
            setupTabs();
            setupBalanceManagement();
            setupKioskMode();
            setupTransactionHistory();
            
            // Set up logout button
            ui.logoutButton.addEventListener('click', logout);
            
            // Auto-focus student search on load
            ui.studentSearch.focus();
            
            showNotification("Admin dashboard initialized successfully", "success");
        } catch (error) {
            console.error("Initialization error:", error);
            showNotification("System initialization failed. Please check your connection.", "error", 5000);
        } finally {
            hideLoading();
        }
    }
    
    // Start initialization
    init();

    console.log("Admin Dashboard Initialization Complete");
});
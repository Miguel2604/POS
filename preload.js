// preload.js with support for both vendor and admin functionality, including image upload
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Authentication operations
    auth: {
      login: (credentials) => ipcRenderer.invoke('auth-login', credentials),
      logout: () => ipcRenderer.invoke('auth-logout'),
      getSession: () => ipcRenderer.invoke('auth-get-session'),
      getCurrentVendor: () => ipcRenderer.invoke('auth-get-current-vendor') // Keep if needed elsewhere
    },

    // Database operations - these now require authentication
    students: {
      getAll: () => ipcRenderer.invoke('supabase-students-get'),
      getByUid: (uid) => ipcRenderer.invoke('supabase-student-get-by-uid', uid),
      save: (student) => ipcRenderer.invoke('supabase-students-save', student) // Used by admin? Or just vendor? Keep for now.
    },

    // Vendor-specific operations
    products: {
      getAll: () => ipcRenderer.invoke('supabase-products-get'),
      save: (product) => ipcRenderer.invoke('supabase-products-save', product),
      delete: (id) => ipcRenderer.invoke('supabase-products-delete', id)
    },

    transactions: {
      getAll: () => ipcRenderer.invoke('supabase-transactions-get'), // Used by vendor
      save: (transaction) => ipcRenderer.invoke('supabase-transactions-save', transaction), // Used by vendor
      getSalesSummary: (period) => ipcRenderer.invoke('supabase-get-sales-summary', period) // Used by vendor
    },

    // Admin operations
    admin: {
      getInfo: () => ipcRenderer.invoke('supabase-admin-get-info'),
      getStudentByUid: (uid) => ipcRenderer.invoke('supabase-admin-get-student-by-uid', uid),
      topUpBalance: (studentUid, amount) => ipcRenderer.invoke('supabase-admin-topup-balance', studentUid, amount),
      getStudentTransactions: (studentUid) => ipcRenderer.invoke('supabase-admin-get-student-transactions', studentUid),
      getAllTransactions: (filters) => ipcRenderer.invoke('supabase-admin-get-all-transactions', filters),

      // --- NEW: Image Upload Endpoints ---
      // Pass file metadata (path, name, type) instead of raw File object
      uploadStudentImage: (studentUid, fileData) => ipcRenderer.invoke('supabase-admin-upload-image', studentUid, fileData),
      updateStudentImageUrl: (studentUid, imageUrl) => ipcRenderer.invoke('supabase-admin-update-image-url', studentUid, imageUrl)
      // --- END NEW ---
    }
  }
);

console.log("Preload script loaded and API exposed.");
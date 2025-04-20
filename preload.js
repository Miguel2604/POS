// preload.js with authentication support (no registration)
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
      getCurrentVendor: () => ipcRenderer.invoke('auth-get-current-vendor')
    },
    
    // Database operations - these now require authentication
    students: {
      getAll: () => ipcRenderer.invoke('supabase-students-get'),
      getByUid: (uid) => ipcRenderer.invoke('supabase-student-get-by-uid', uid), // Added for direct lookup
      save: (student) => ipcRenderer.invoke('supabase-students-save', student)
    },
    products: {
      getAll: () => ipcRenderer.invoke('supabase-products-get'),
      save: (product) => ipcRenderer.invoke('supabase-products-save', product),
      delete: (id) => ipcRenderer.invoke('supabase-products-delete', id)
    },
    transactions: {
      getAll: () => ipcRenderer.invoke('supabase-transactions-get'),
      save: (transaction) => ipcRenderer.invoke('supabase-transactions-save', transaction)
    }
  }
);

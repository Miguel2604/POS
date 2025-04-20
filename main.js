// main.js - Complete version with shared students

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://wbxuckseigdwqrxbwshg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndieHVja3NlaWdkd3FyeGJ3c2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMjU5NjUsImV4cCI6MjA2MDcwMTk2NX0.1a4_3X2AAZuzfTqciLdydCr7xoQEqiFFjx_jHwGpGZ8';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Store the current vendor ID 
let currentVendorId = null;
let authSession = null;
let mainWindow = null;

// Check authentication status and load the appropriate page
async function checkAuthAndLoadPage() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth check error:', error);
      mainWindow.loadFile(path.join(__dirname, 'login.html'));
      return;
    }
    
    if (data.session) {
      // Store the session
      authSession = data.session;
      
      // Get vendor information
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();
        
      if (vendorError) {
        console.error('Vendor fetch error:', vendorError);
        mainWindow.loadFile(path.join(__dirname, 'login.html'));
        return;
      }
      
      if (vendorData) {
        // Store the current vendor ID
        currentVendorId = vendorData.id;
        // Load main application page
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        return;
      } else {
        console.error('No vendor account found for this user');
        // Sign out the user since they don't have a vendor account
        await supabase.auth.signOut();
        mainWindow.loadFile(path.join(__dirname, 'login.html'));
        return;
      }
    }
    
    // No active session, load login page
    mainWindow.loadFile(path.join(__dirname, 'login.html'));
  } catch (error) {
    console.error('Session check error:', error);
    mainWindow.loadFile(path.join(__dirname, 'login.html'));
  }
}

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Check authentication and load appropriate page
  checkAuthAndLoadPage();

  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools();
}

// App ready event
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Auth-related IPC handlers
ipcMain.handle('auth-login', async (event, { email, password }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Store the user session
    authSession = data.session;
    
    // Get vendor information
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
      
    if (vendorError) throw vendorError;
    
    if (!vendorData) {
      // Sign out the user since they don't have a vendor account
      await supabase.auth.signOut();
      throw new Error('No vendor account associated with this user. Please contact your administrator.');
    }
    
    // Store the current vendor ID
    currentVendorId = vendorData.id;
    
    return {
      user: data.user,
      vendor: vendorData
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
});

ipcMain.handle('auth-logout', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear vendor ID and session
    currentVendorId = null;
    authSession = null;
    
    // Redirect to login page
    mainWindow.loadFile(path.join(__dirname, 'login.html'));
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
});

ipcMain.handle('auth-get-session', async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (data.session) {
      // Store the session
      authSession = data.session;
      
      // Get vendor information
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();
        
      if (vendorError) throw vendorError;
      
      if (vendorData) {
        // Store the current vendor ID
        currentVendorId = vendorData.id;
        
        return {
          user: data.session.user,
          vendor: vendorData,
          session: data.session
        };
      }
    }
    
    return { session: null };
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
});

ipcMain.handle('auth-get-current-vendor', async () => {
  if (!currentVendorId || !authSession) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', currentVendorId)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Get current vendor error:', error);
    throw error;
  }
});

// Modified data handlers for shared students
ipcMain.handle('supabase-students-get', async () => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // No vendor filtering - all vendors can see all students
    const { data, error } = await supabase
      .from('students')
      .select('*');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
});

// Handler to get a single student by UID
ipcMain.handle('supabase-student-get-by-uid', async (event, uid) => {
  console.log(`[main.js] Received request for supabase-student-get-by-uid with UID: "${uid}"`); // Log received UID
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    console.log(`[main.js] Querying Supabase for student with UID: "${uid}"`); // Log before query
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('uid', uid)
      .single(); // Expecting only one student or null
      
    if (error && error.code !== 'PGRST116') { // Ignore 'Row not found' error, return null instead
      console.error(`[main.js] Supabase error fetching UID ${uid}:`, error); // Log actual Supabase errors
      throw error;
    }
    
    if (!data) {
      console.log(`[main.js] Student with UID "${uid}" not found in Supabase.`); // Log if not found
    } else {
      console.log(`[main.js] Found student data for UID "${uid}":`, data); // Log if found
    }
    
    return data; // Returns the student object or null if not found
  } catch (error) {
    console.error(`[main.js] General error fetching student by UID ${uid}:`, error); // Log any other errors
    throw error;
  }
});

ipcMain.handle('supabase-students-save', async (event, student) => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // No vendor_id for students, they are shared across all vendors
    const { data, error } = await supabase
      .from('students')
      .upsert(student, { onConflict: 'uid' });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving student:', error);
    throw error;
  }
});

ipcMain.handle('supabase-products-get', async () => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // Products are still vendor-specific
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', currentVendorId);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
});

ipcMain.handle('supabase-products-save', async (event, product) => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // Ensure the product is associated with this vendor
    product.vendor_id = currentVendorId;
    
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
});

ipcMain.handle('supabase-products-delete', async (event, id) => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // Add a check to make sure this product belongs to the current vendor
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('vendor_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    if (product.vendor_id !== currentVendorId) {
      throw new Error('Unauthorized to delete this product');
    }
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

ipcMain.handle('supabase-transactions-get', async () => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // Transactions are still vendor-specific
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('vendor_id', currentVendorId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
});

// Modified transaction handler to include vendor information
ipcMain.handle('supabase-transactions-save', async (event, transaction) => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');
    
    // Get the current vendor's info to include in the transaction
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('name')
      .eq('id', currentVendorId)
      .single();
      
    if (vendorError) throw vendorError;
    
    // Ensure the transaction is associated with this vendor
    transaction.vendor_id = currentVendorId;
    transaction.vendor_name = vendorData.name;
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
});

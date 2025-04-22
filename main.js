// main.js - Original structure with added image upload functionality for admins

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs'); // <-- ADDED for file reading
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://wbxuckseigdwqrxbwshg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndieHVja3NlaWdkd3FyeGJ3c2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMjU5NjUsImV4cCI6MjA2MDcwMTk2NX0.1a4_3X2AAZuzfTqciLdydCr7xoQEqiFFjx_jHwGpGZ8';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Store the current user role information
let currentVendorId = null;
let currentAdminId = null;
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

      // First check if user is a vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();

      if (!vendorError && vendorData) {
        // User is a vendor
        currentVendorId = vendorData.id;
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        return;
      }

      // If not a vendor, check if user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();

      if (!adminError && adminData) {
        // User is an admin
        currentAdminId = adminData.id;
        mainWindow.loadFile(path.join(__dirname, 'admin.html'));
        return;
      }

      // User is neither vendor nor admin
      console.error('No vendor account or admin account found for this user');
      // Sign out the user since they don't have a role
      await supabase.auth.signOut();
      mainWindow.loadFile(path.join(__dirname, 'login.html'));
      return;
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
    },
    autoHideMenuBar: true
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

// --- Start Original IPC Handlers ---

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

    // First, check if user is a vendor
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (!vendorError && vendorData) {
      // User is a vendor
      currentVendorId = vendorData.id;
      return {
        role: 'vendor',
        user: data.user,
        vendor: vendorData
      };
    }

    // If not a vendor, check if user is an admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (!adminError && adminData) {
      // User is an admin
      currentAdminId = adminData.id;
      return {
        role: 'admin',
        user: data.user,
        admin: adminData
      };
    }

    // User has no role
    // Sign out the user since they don't have a role
    await supabase.auth.signOut();
    throw new Error('No vendor or admin account associated with this user. Please contact your administrator.');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
});

ipcMain.handle('auth-logout', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear user IDs and session
    currentVendorId = null;
    currentAdminId = null;
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

      // If we're already authenticated as a vendor, return vendor info
      if (currentVendorId) {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', currentVendorId)
          .single();

        if (vendorError) throw vendorError;

        return {
          role: 'vendor',
          user: data.session.user,
          vendor: vendorData,
          session: data.session
        };
      }

      // If we're already authenticated as an admin, return admin info
      if (currentAdminId) {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', currentAdminId)
          .single();

        if (adminError) throw adminError;

        return {
          role: 'admin',
          user: data.session.user,
          admin: adminData,
          session: data.session
        };
      }

      // We have a session but no role stored, check both roles
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();

      if (vendorData) {
        currentVendorId = vendorData.id;
        return {
          role: 'vendor',
          user: data.session.user,
          vendor: vendorData,
          session: data.session
        };
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();

      if (adminData) {
        currentAdminId = adminData.id;
        return {
          role: 'admin',
          user: data.session.user,
          admin: adminData,
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

// Vendor-specific IPC handlers
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
    // Check if user is authenticated
    if (!currentVendorId && !currentAdminId) throw new Error('Not authenticated');

    // No vendor filtering - all vendors/admins can see all students
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
  console.log(`[main.js] Received request for supabase-student-get-by-uid with UID: "${uid}"`);
  try {
    // Check if user is authenticated
    if (!currentVendorId && !currentAdminId) throw new Error('Not authenticated');

    console.log(`[main.js] Querying Supabase for student with UID: "${uid}"`);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'Row not found' error, return null instead
      console.error(`[main.js] Supabase error fetching UID ${uid}:`, error);
      throw error;
    }

    if (!data) {
      console.log(`[main.js] Student with UID "${uid}" not found in Supabase.`);
    } else {
      console.log(`[main.js] Found student data for UID "${uid}":`, data);
    }

    return data; // Returns the student object or null if not found
  } catch (error) {
    console.error(`[main.js] General error fetching student by UID ${uid}:`, error);
    throw error;
  }
});

ipcMain.handle('supabase-students-save', async (event, student) => {
  try {
    // Check if user is authenticated (Admin or Vendor might save/update students)
    if (!currentVendorId && !currentAdminId) throw new Error('Not authenticated');

    // No vendor_id for students, they are shared across all vendors/admins
    const { data, error } = await supabase
      .from('students')
      .upsert(student, { onConflict: 'uid' }); // Use upsert to insert or update

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

    let data, error;

    if (product.id) {
      // Update existing product
      const productId = product.id;
      // Don't try to update vendor_id or id itself
      const { id, vendor_id, ...updateData } = product;
      ({ data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .eq('vendor_id', currentVendorId) // Ensure vendor owns this product
        .select() // Select the updated row
        .single()); // Expect a single row
    } else {
      // Insert new product - DO NOT include 'id' if it's auto-generated by DB
      const { id, ...insertData } = product; // Remove potential null/undefined id
      console.log('[main.js] Attempting to insert product with data:', insertData); // Log the data being inserted
      ({ data, error } = await supabase
        .from('products')
        .insert(insertData)
        .select() // Select the newly inserted row
        .single()); // Expect a single row
    }

    if (error) {
        // Log the specific operation type for better debugging
        console.error(`Error ${product.id ? 'updating' : 'inserting'} product:`, error);
        throw error; // Let the catch block handle it
    }
    return data; // Return the saved/updated product data
  } catch (error) {
    console.error('Error saving product:', error);
    // Throw a new error with the message string for proper IPC serialization
    throw new Error(error.message || 'An unknown error occurred while saving the product.');
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

    if (!product || product.vendor_id !== currentVendorId) { // Added check for !product
      throw new Error('Unauthorized to delete this product or product not found');
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
    if (!currentVendorId && !currentAdminId) throw new Error('Not authenticated');

    // For vendors, only show their transactions
    if (currentVendorId) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', currentVendorId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    }

    // For admins, show all transactions (or define specific admin logic if needed)
    // This currently returns nothing for admins, modify if needed
    // if (currentAdminId) {
    //   const { data, error } = await supabase
    //     .from('transactions')
    //     .select('*')
    //     .order('timestamp', { ascending: false });
    //   if (error) throw error;
    //   return data;
    // }

    return []; // Return empty array if not a vendor or no specific admin logic
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
      .insert(transaction); // Insert purchase transaction

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
});

// Vendor Sales Summary Handler
ipcMain.handle('supabase-get-sales-summary', async (event, period) => {
  try {
    if (!currentVendorId) throw new Error('No vendor logged in');

    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'day':
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now); const dayOfWeek = startDate.getDay(); const diff = startDate.getDate() - dayOfWeek; startDate.setDate(diff); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); endDate.setHours(23, 59, 59, 999);
        break;
      default: throw new Error('Invalid period specified');
    }

    console.log(`[Sales Summary] Period: ${period}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    const { data, error } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('vendor_id', currentVendorId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (error) { console.error('Error fetching sales summary:', error); throw error; }

    const totalSales = data.reduce((sum, transaction) => sum + (transaction.total_amount || 0), 0);

    console.log(`[Sales Summary] Total Sales for ${period}: ${totalSales}`);
    return { totalSales: totalSales };

  } catch (error) { console.error('Error calculating sales summary:', error); throw error; }
});

// Admin IPC Handlers
ipcMain.handle('supabase-admin-get-info', async () => {
  try {
    if (!currentAdminId || !authSession) { return null; }
    const { data, error } = await supabase.from('admins').select('*').eq('id', currentAdminId).single();
    if (error) throw error; return data;
  } catch (error) { console.error('Get admin info error:', error); throw error; }
});

ipcMain.handle('supabase-admin-get-student-by-uid', async (event, uid) => {
  try {
    if (!currentAdminId) throw new Error('Not authorized as admin');
    const { data, error } = await supabase.from('students').select('*').eq('uid', uid).single();
    if (error && error.code !== 'PGRST116') throw error; return data;
  } catch (error) { console.error('Admin get student error:', error); throw error; }
});

ipcMain.handle('supabase-admin-topup-balance', async (event, studentUid, amount) => {
  try {
    if (!currentAdminId) throw new Error('Not authorized as admin');
    const { data: adminData, error: adminError } = await supabase.from('admins').select('*').eq('id', currentAdminId).single();
    if (adminError) throw adminError;
    const { data: student, error: studentError } = await supabase.from('students').select('*').eq('uid', studentUid).single();
    if (studentError) throw studentError;
    if (!student) throw new Error(`Student with UID ${studentUid} not found.`); // Added check
    const newBalance = student.balance + amount;
    const { data: updatedStudent, error: updateError } = await supabase.from('students').update({ balance: newBalance }).eq('uid', studentUid).select().single();
    if (updateError) throw updateError;
    const { error: transactionError } = await supabase.from('balance_transactions').insert({ student_uid: studentUid, amount: amount, admin_id: currentAdminId, admin_name: adminData.name, timestamp: new Date().toISOString(), type: 'topup' });
    if (transactionError) { console.warn('Error logging topup transaction:', transactionError); /* Log error but don't fail */ }
    return updatedStudent;
  } catch (error) { console.error('Admin topup error:', error); throw error; }
});

ipcMain.handle('supabase-admin-get-student-transactions', async (event, studentUid) => {
  try {
    if (!currentAdminId) throw new Error('Not authorized as admin');
    const { data: purchaseTransactions, error: purchaseError } = await supabase.from('transactions').select('*').eq('student_uid', studentUid).order('timestamp', { ascending: false }).limit(5);
    if (purchaseError) throw purchaseError;
    const { data: topupTransactions, error: topupError } = await supabase.from('balance_transactions').select('*').eq('student_uid', studentUid).order('timestamp', { ascending: false }).limit(5);
    if (topupError) throw topupError;
    const allTransactions = [
      ...(purchaseTransactions || []).map(tx => ({ ...tx, type: 'purchase' })),
      ...(topupTransactions || []).map(tx => ({ ...tx, type: 'topup' }))
    ];
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return allTransactions.slice(0, 5);
  } catch (error) { console.error('Get student transactions error:', error); throw error; }
});

ipcMain.handle('supabase-admin-get-all-transactions', async (event, filters) => {
  try {
    if (!currentAdminId) throw new Error('Not authorized as admin');
    const { startDate, type, searchTerm } = filters || {};
    let purchaseTransactions = [];
    if (!type || type === 'all' || type === 'purchase') {
      let purchaseQuery = supabase.from('transactions').select('*, students!inner(name)').order('timestamp', { ascending: false });
      if (startDate) { purchaseQuery = purchaseQuery.gte('timestamp', startDate); }
      const { data, error } = await purchaseQuery;
      if (error) throw error; purchaseTransactions = data || [];
    }
    let topupTransactions = [];
    if (!type || type === 'all' || type === 'topup') {
      let topupQuery = supabase.from('balance_transactions').select('*, students!inner(name)').order('timestamp', { ascending: false });
      if (startDate) { topupQuery = topupQuery.gte('timestamp', startDate); }
      const { data, error } = await topupQuery;
      if (error) throw error; topupTransactions = data || [];
    }
    const processedPurchases = purchaseTransactions.map(tx => ({ ...tx, type: 'purchase', student_name: tx.students?.name || 'Unknown' }));
    const processedTopups = topupTransactions.map(tx => ({ ...tx, type: 'topup', student_name: tx.students?.name || 'Unknown' }));
    let allTransactions = [...processedPurchases, ...processedTopups];
    if (searchTerm) {
      allTransactions = allTransactions.filter(tx =>
        (tx.student_uid && tx.student_uid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.student_name && tx.student_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return allTransactions;
  } catch (error) { console.error('Get all transactions error:', error); throw error; }
});

// --- End Original IPC Handlers ---


// --- *** ADDED: Admin Image Upload Handlers *** ---

ipcMain.handle('supabase-admin-upload-image', async (event, studentUid, fileData) => {
    console.log('Handling image upload for student:', studentUid);
    if (!currentAdminId) throw new Error('Not authorized as admin');

    // fileData should contain { path: '...', name: '...', type: '...' }
    if (!fileData || !fileData.path || !fileData.name || !fileData.type) {
        throw new Error('Invalid file data received in main process.');
    }

    const BUCKET_NAME = 'student-images'; // Use your actual bucket name

    try {
        // 1. Read file content from the path provided by the renderer
        const fileBuffer = fs.readFileSync(fileData.path);
        console.log(`Read file buffer for ${fileData.name}, size: ${fileBuffer.length}`);

        // 2. Create a unique file path/name in the bucket
        const fileExtension = path.extname(fileData.name);
        // Store directly in the bucket root or a specific folder like 'public/'
        const fileNameInBucket = `${studentUid}_${Date.now()}${fileExtension}`;
        console.log(`Uploading to bucket path: ${fileNameInBucket}`);

        // 3. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileNameInBucket, fileBuffer, {
                contentType: fileData.type,
                upsert: true // Overwrite if file with same name exists
            });

        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw uploadError;
        }

        console.log('Upload successful:', uploadData);

        // 4. Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileNameInBucket);

        if (!urlData || !urlData.publicUrl) {
            console.error('Could not retrieve public URL after upload.');
            throw new Error('File uploaded but could not retrieve public URL.');
        }

        console.log(`Public URL generated: ${urlData.publicUrl}`);
        return urlData.publicUrl;

    } catch (error) {
        console.error('Error during image upload process:', error);
        throw error; // Re-throw error to be caught by renderer
    }
});

ipcMain.handle('supabase-admin-update-image-url', async (event, studentUid, imageUrl) => {
    console.log(`Updating picture_url for student ${studentUid}`);
    if (!currentAdminId) throw new Error('Not authorized as admin');

    // Allow setting URL to null to remove image association
    if (imageUrl !== null && typeof imageUrl !== 'string') {
        console.warn("Invalid Image URL provided for update, setting to null.");
        imageUrl = null;
    }

    try {
        const { data: updatedStudent, error } = await supabase
            .from('students')
            .update({ picture_url: imageUrl }) // Use 'picture_url' from schema
            .eq('uid', studentUid)
            .select() // Select the updated row to return it
            .single(); // Expect only one row

        if (error) {
            console.error('Error updating student picture_url in DB:', error);
            throw error;
        }

        console.log(`Successfully updated picture_url for ${studentUid}`);
        return updatedStudent; // Return the full updated student record

    } catch (dbError) {
        console.error('Database error during picture_url update:', dbError);
        throw dbError; // Re-throw error to be caught by renderer
    }
});

// --- *** END ADDED *** ---


console.log("Main process started and IPC handlers registered.");
// End of main.js file

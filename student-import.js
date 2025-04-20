// student-import.js
// Run this script to directly import students to Supabase
// Usage: node student-import.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration - replace with your actual credentials
const SUPABASE_URL = 'https://wbxuckseigdwqrxbwshg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndieHVja3NlaWdkd3FyeGJ3c2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMjU5NjUsImV4cCI6MjA2MDcwMTk2NX0.1a4_3X2AAZuzfTqciLdydCr7xoQEqiFFjx_jHwGpGZ8';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Path to the JSON file containing student data
const STUDENTS_FILE = './shared_students_data.json';

async function importStudents() {
    try {
        // Read the JSON file
        const fileData = fs.readFileSync(STUDENTS_FILE, 'utf8');
        const data = JSON.parse(fileData);
        
        if (!data.students || !Array.isArray(data.students)) {
            console.error('Invalid data format: "students" array not found');
            return;
        }
        
        console.log(`Found ${data.students.length} students to import`);
        
        // Import students in batches to avoid hitting any rate limits
        const BATCH_SIZE = 10;
        for (let i = 0; i < data.students.length; i += BATCH_SIZE) {
            const batch = data.students.slice(i, i + BATCH_SIZE);
            console.log(`Importing batch ${i/BATCH_SIZE + 1}...`);
            
            const { data: result, error } = await supabase
                .from('students')
                .upsert(batch, { onConflict: 'uid' });
                
            if (error) {
                console.error('Error importing batch:', error);
            } else {
                console.log(`Successfully imported ${batch.length} students`);
            }
            
            // Short delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('Import complete!');
    } catch (error) {
        console.error('Import failed:', error);
    }
}

// Run the import function
importStudents().catch(console.error);
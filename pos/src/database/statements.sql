-- Students table to store student information and balances
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,  -- RFID card number/student ID
    name TEXT NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table for menu items
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price DECIMAL(6, 2) NOT NULL,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for purchase records
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    total_amount DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Transaction items for individual items in each transaction
CREATE TABLE transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(6, 2) NOT NULL,  -- Store price at time of purchase
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Balance history to track all balance changes
CREATE TABLE balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,  -- Positive for deposits, negative for purchases
    type TEXT NOT NULL,  -- 'deposit', 'purchase', 'refund', etc.
    reference_id INTEGER,  -- Optional: transaction_id for purchases
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Insert some sample products
INSERT INTO products (name, price) VALUES
('Burger', 5.99),
('Pizza Slice', 3.99),
('Salad Bowl', 4.50),
('Coffee', 2.00),
('Bottled Water', 1.50),
('Sandwich', 4.99),
('Fruit Cup', 3.50),
('Tea', 1.75);

-- Insert some sample students
INSERT INTO students (student_id, name, balance) VALUES
('0008299626', 'Miguel Kalaw', 50.00)

-- SQLite version to delete data and reset auto-increment counters
DELETE FROM balance_history;
DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM products;
DELETE FROM students;

-- Reset auto-increment counters in SQLite
DELETE FROM sqlite_sequence WHERE name IN ('balance_history', 'transaction_items', 'transactions', 'products', 'students');

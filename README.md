# University Canteen POS System

A comprehensive Point of Sale (POS) system for university canteens with vendor and admin interfaces, built with Electron and Supabase.

## Overview

This application provides a dual-role system for managing university canteen operations:

- **Vendor Interface**: Allows canteen vendors to process student purchases
- **Admin Interface**: Enables administrators to manage student balances and view transaction history

Both interfaces share the same database, ensuring consistent data across the system.

## Features

### Vendor Features
- Process student purchases via RFID/card scanning
- Manage product catalog (add, edit, delete)
- View transaction history
- Real-time balance checking

### Admin Features
- Top up student balances
- View comprehensive transaction history
- Self-service kiosk mode for students to check balance
- Filter and search transactions

### General Features
- Secure authentication with role-based access
- Offline capability with data synchronization
- Simple and intuitive interface
- Real-time database integration with Supabase

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup
1. Clone the repository
   ```
   git clone https://github.com/yourusername/university-canteen-pos.git
   cd university-canteen-pos
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Configure Supabase
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Execute the database setup scripts in the Supabase SQL Editor
   - Update Supabase URL and anon key in `main.js`

4. Run the application
   ```
   npm start
   ```

## Building the Application

To create an executable:

```
npm run package-win  # For Windows
npm run package-mac  # For macOS
npm run package-linux  # For Linux
```

This creates a packaged application in the `dist` folder.

## Administration

### Creating Admin Accounts

1. Create a user in Supabase Authentication
2. Add the user to the admins table:
   ```sql
   INSERT INTO admins (user_id, name)
   VALUES ('auth-user-id-from-supabase', 'Admin Name');
   ```

### Adding Students

Students can be added to the system via the Supabase database:

```sql
INSERT INTO students (uid, name, balance)
VALUES ('student-id', 'Student Name', 0.00);
```

## Database Schema

The system uses the following main tables:

- **students**: Student information and balances
- **vendors**: Vendor accounts
- **admins**: Administrator accounts
- **products**: Products offered by vendors
- **transactions**: Purchase transactions
- **balance_transactions**: Balance top-up transactions

## Development

### Project Structure
```
university-canteen-pos/
├── main.js           # Main Electron process
├── preload.js        # Preload script for secure API
├── index.html        # Vendor interface
├── admin.html        # Admin interface
├── login.html        # Login interface
├── app.js            # Vendor interface logic
├── admin.js          # Admin interface logic
├── assets/           # Icons and images
├── dist/             # Built applications
└── node_modules/     # Dependencies
```

### Technology Stack
- **Electron**: Cross-platform desktop application framework
- **Supabase**: Backend and authentication
- **HTML**: User interface structure
- **Tailwind CSS**: Styling
- **JavaScript**: Application logic

## Troubleshooting

### Common Issues

1. **Authentication Problems**
   - Verify user exists in both auth.users and role-specific tables (vendors or admins)
   - Check Supabase project settings and keys

2. **RFID Reader Issues**
   - Ensure the reader is properly connected
   - Check that input is focused on the correct field

3. **Building Issues**
   - When building on Windows, run command prompt as administrator or use WSL
   - Create a proper assets folder with application icons

## License

MIT

## Contributors

- [Miguel Kalaw](https://github.com/Miguel2604)


# 🎓 University Canteen POS System

A modern, all-in-one Point of Sale (POS) system built for university canteens — complete with vendor and admin tools, powered by Electron and Supabase.

---

## 🚀 What This App Does

This system helps streamline daily operations in your university canteen. Whether you're a vendor selling meals or an admin managing balances, everything runs smoothly through a shared, real-time database.

### 👨‍🍳 Vendor Dashboard

- Scan RFID cards to process student purchases
- Add, edit, or remove items from your menu
- View your sales history
- Instantly check student balances

### 🛠️ Admin Panel

- Top-up student accounts
- Review full transaction logs
- Enable self-service kiosk mode for balance inquiries
- Filter and search through records with ease

### 🌐 General Features

- Secure login with role-based access
- Works offline, syncs when back online
- Clean, simple UI
- Real-time database updates with Supabase

---

## 🧰 Getting Started

### 📋 Prerequisites

Make sure you’ve got the following:

- Node.js (v14 or above)
- npm (v6 or above)

### ⚙️ Installation

1. Clone the project:

   ```bash
   git clone https://github.com/yourusername/university-canteen-pos.git
   cd university-canteen-pos
   ```

2. Install all dependencies:

   ```bash
   npm install
   ```

3. Set up Supabase:

   - Create a project at [supabase.com](https://supabase.com)
   - Run the provided SQL setup scripts in the Supabase SQL Editor
   - Update your Supabase URL and anon key in `main.js`

4. Run the app:

   ```bash
   npm start
   ```

---

## 🏗️ Build It for Production

Want to create a standalone app?

```bash
npm run package-win     # Windows
npm run package-mac     # macOS
npm run package-linux   # Linux
```

Your packaged app will appear in the `dist` folder.

---

## 🔐 Admin & Student Management

### 👤 Create an Admin

1. Add a new user via Supabase Authentication
2. Insert into the `admins` table:
   ```sql
   INSERT INTO admins (user_id, name)
   VALUES ('auth-user-id-from-supabase', 'Admin Name');
   ```

### 🎓 Add Students

Insert directly into the `students` table:

```sql
INSERT INTO students (uid, name, balance)
VALUES ('student-id', 'Student Name', 0.00);
```

---

## 🧱 Database Overview

Here’s a quick look at the core tables:

- `students` – Student info and balances
- `vendors` – Vendor accounts
- `admins` – Admin accounts
- `products` – Vendor product listings
- `transactions` – Purchase logs
- `balance_transactions` – Balance top-ups

---

## 🧪 Project Structure

```
university-canteen-pos/
├── main.js            # Electron's main process
├── preload.js         # Secure bridge between UI and backend
├── index.html         # Vendor UI
├── admin.html         # Admin UI
├── login.html         # Login screen
├── app.js             # Vendor logic
├── admin.js           # Admin logic
├── assets/            # Images and icons
├── dist/              # Packaged apps
└── node_modules/      # Dependencies
```

---

## 🛠 Tech Stack

- **Electron** – For cross-platform desktop support
- **Supabase** – Backend + Auth (Postgres + Realtime)
- **Tailwind CSS** – UI styling
- **JavaScript & HTML** – Interface logic and structure

---

## 🚯 Common Issues & Fixes

### ❌ Can’t log in?

- Make sure the user exists in both `auth.users` and the relevant role table (`vendors` or `admins`)
- Double-check Supabase credentials

### 🔌 RFID reader not working?

- Make sure it's plugged in and detected
- Focus the correct input field before scanning

### 🧱 Build failed?

- Try running the terminal/command prompt as administrator
- Ensure you have app icons set up in `assets/`

---

## 📄 License

MIT — use it, tweak it, ship it. 🚢

---

## 👨‍💼 Author

Built with ❤️ by [Miguel Kalaw](https://github.com/Miguel2604)


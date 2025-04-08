# University Canteen POS System

A simple offline Point-of-Sale (POS) application designed for university canteens. Students pay using their RFID-enabled ID cards, with all data stored locally in the browser.

---

## Features

- **Minimalist, fast UI** built with Tailwind CSS for efficient cashier operation
- **Product menu** with quantity selectors and add-to-cart functionality
- **Shopping cart** showing selected items and total amount
- **RFID payment modal**:
  - Accepts student ID via RFID reader (keyboard emulation)
  - Masks input for privacy
  - Checks student balance before confirming payment
- **Transaction processing**:
  - Deducts purchase amount from student balance
  - Records transaction details with timestamp
  - Displays success or error messages
- **Admin Panel**:
  - View all student accounts and balances
  - View transaction history
  - (Future) Manage products, edit balances, export/import data

---

## Usage

1. **Open `index.html`** in a modern web browser (Chrome, Edge, Firefox).
2. **Add products to the cart** by selecting quantity and clicking "Add to Cart".
3. **Click "Proceed to Payment"** when ready.
4. **Scan student RFID card** (or enter UID manually) in the payment modal.
5. **Click "Confirm Payment"** to process the transaction.
6. **Success message** will appear, and the cart will reset.

---

## Admin Panel

- Click the **"Admin Panel"** button at the top of the page.
- View **student accounts** with current balances.
- View **transaction history** with timestamps and details.
- Close the panel with the **×** button.

---

## Data Storage

- Currently, all data (students, transactions) is stored **in-memory**.
- Data **will reset** on page reload.
- (Planned) Use **LocalStorage** for persistent offline data.

---

## Development Notes

- Built with **vanilla JavaScript** and **Tailwind CSS** via CDN.
- Designed for **offline use** in a browser environment.
- RFID reader acts as a **keyboard emulator**, inputting the UID into a password field.
- No backend server required.

---

## Future Improvements

- Persistent data storage with LocalStorage or IndexedDB
- Admin features: add/edit/delete students, manage products
- Export/import data for backup
- User authentication for admin access
- Packaging as a standalone desktop app (e.g., Electron)

---

## License

MIT License

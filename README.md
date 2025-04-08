# University Canteen POS System

An offline Point-of-Sale (POS) application for university canteens, supporting RFID-based payments, persistent local storage, and an admin interface.

---

## Features

- **Minimalist, fast UI** with Tailwind CSS
- **Product menu** with quantity selectors and add-to-cart
- **Shopping cart** with subtotal and total
- **RFID payment modal**:
  - Accepts student ID via RFID reader (keyboard emulation)
  - Masks input for privacy
  - Checks student balance before confirming payment
- **Transaction processing**:
  - Deducts from student balance
  - Records transaction details with timestamp
  - Displays success/error messages
- **Persistent offline storage** using IndexedDB:
  - Students
  - Transactions
  - Products
- **Admin Panel**:
  - View, search, and edit student accounts
  - View transaction history
  - Add, edit, delete products dynamically
  - Export/import all data as JSON
  - Reset database (clear all data)
  - Close panel with button or Escape key

---

## Usage

1. **Open `index.html`** in a modern browser (Chrome, Edge, Firefox).
2. **Add products to cart** by selecting quantity and clicking "Add to Cart".
3. **Click "Proceed to Payment"**.
4. **Scan student RFID card** or enter UID manually.
5. **Click "Confirm Payment"** to process.
6. **Success message** appears, cart resets.

---

## Admin Panel

- Click **"Admin Panel"** button at the top.
- **Student Accounts**:
  - Search by name or UID
  - Edit balances inline, click Save
- **Transaction History**:
  - View all past transactions
- **Product Management**:
  - Add new products with name and price
  - Edit or delete existing products
  - Changes reflect immediately in POS menu
- **Data Export/Import**:
  - Export all data as JSON backup
  - Import JSON to restore data
- **Reset Database**:
  - Clears all data and resets app
- **Close panel** with Exit button or Escape key

---

## Data Storage

- Uses **IndexedDB** for offline persistence
- Data survives page reloads and browser restarts
- Reset or import to clear/replace data

---

## Development Notes

- Built with **vanilla JavaScript** and **Tailwind CSS**
- Designed for **offline use** in browser or ElectronJS
- RFID reader acts as **keyboard input**
- No backend server required

---

## Future Improvements

- User authentication for admin access
- Packaging as a desktop app (Electron)
- More detailed transaction reports
- Role-based permissions
- UI enhancements and accessibility

---

## License

MIT License

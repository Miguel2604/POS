# University Canteen POS System

![POS System](https://img.shields.io/badge/Status-Development-yellow) 
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Prisma%20%7C%20SQLite-blue)

A simple offline point-of-sale (POS) web application for university canteens that uses RFID-enabled student ID cards for cashless transactions.

## Features

- **RFID-based transactions**: Students tap RFID cards (keyboard-emulated UID input)
- **Offline-first design**: SQLite database with no cloud dependencies
- **Balance management**:
  - Real-time balance deduction for purchases
  - Admin interface for credit reloading
- **Transaction history**: Complete audit trail
- **Local API**: Next.js API routes handle all operations

## Technology Stack

- **Frontend**: Next.js (React)
- **Backend**: Next.js API routes
- **Database**: SQLite
- **ORM**: Prisma
- **RFID Integration**: HID keyboard emulation
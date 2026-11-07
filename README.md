# SakhiDesk 🌸
### AI-Powered Business Management Platform for Women Entrepreneurs
**Transform messy customer chats into verified orders, review with AI, and generate real PayPal Sandbox Invoices.**

---

## 🌟 Product Vision & Overview

**SakhiDesk** is an end-to-end business assistant built specifically for women running home-based and independent businesses — such as home bakers, boutique tailors, handmade jewellery artisans, food makers, and handicraft creators.

These entrepreneurs typically receive orders through unstructured WhatsApp chats, voice notes, phone calls, and handwritten notebooks. SakhiDesk transforms that chaotic workflow into a structured, delightful digital experience without requiring any technical background:

1. **AI Order Extraction (English, Hindi, Hinglish)**: Paste customer messages or upload photos of handwritten notes. The AI extracts items, quantities, dates, times, and customer contacts.
2. **Strict "Never Guess" & Needs Attention Alerts**: SakhiDesk never invents missing information or prices. Missing customer emails, ambiguous dates, or unpriced items are flagged with bright yellow **Needs Attention** warnings.
3. **Mandatory Seller Review & Approval**: Sellers review, adjust quantities, confirm prices, and add customization notes before anything is finalized. Invoices are never generated automatically without seller approval.
4. **Real PayPal Sandbox Invoicing API**: Uses PayPal REST API OAuth 2.0 to generate real sequential invoices (`POST /v2/invoicing/invoices`), send invoices (`POST /v2/invoicing/invoices/{id}/send`), fetch live payment status (`GET /v2/invoicing/invoices/{id}`), and trigger reminders.
5. **Real-time Payment Tracking**: Distinguishes confirmed PAID revenue from pending invoices. Invoices are only marked `PAID` when verified live by PayPal.
6. **Shareable Mini-Shop**: Each seller has an online storefront (`/shop/storefront`) where visitors can browse items and submit order requests directly into the seller's review inbox (safe from unauthorized PayPal invoices).
7. **AI Business Assistant ("Sakhi")**: In-app conversational assistant that answers questions using *actual stored business metrics* (never hallucinating financial figures).
8. **AI WhatsApp Promotional Generator**: Generates engaging promotional broadcasts in English, Hindi, and Hinglish with one-click copy and prefilled WhatsApp links.
9. **Persistent Local Database**: Uses persistent SQLite (`better-sqlite3`) with WAL mode, storing orders, customers, products, invoices, and activity feeds.

---

## 🛠️ Tech Stack & Architecture

- **Frontend & Full-Stack**: [Next.js 14 App Router](https://nextjs.org/) (React 18, TypeScript, Tailwind CSS, Lucide React, Recharts)
- **Database**: SQLite with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Zero-latency persistent local database)
- **AI Engine**: Google Gemini API (`gemini-3.5-flash-lite` with multimodal vision & structured JSON output)
- **Payment Gateway**: PayPal Invoicing REST API v2 Sandbox (`https://api-m.sandbox.paypal.com`)
- **Internationalization**: Dynamic multilingual UI with English, हिन्दी (Hindi), and Hinglish

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ or v24 recommended)
- **npm** or **pnpm**

### 2. Environment Configuration
The project is pre-configured with environment variables in `.env.local`. An example template is provided in `.env.example`:

```env
# Google Gemini API (For Hinglish extraction, handwriting OCR, and AI assistant)
GEMINI_API_KEY=your_gemini_api_key_here

# PayPal Sandbox Credentials (REST API Invoicing)
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_ENV=sandbox
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Server URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Installation
```powershell
npm install
```

### 4. Running the Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Running the Production Build
```powershell
npm run build
npm start
```

---

## 🧪 Automated End-to-End Verification Suite

Run our automated verification script that executes a complete live integration test across SQLite, Gemini AI, and the PayPal Sandbox Invoicing API:

```powershell
node scripts/test-e2e.ts
```

**Verification Steps Executed by the Test Suite:**
1. Database tables, schema migrations, and seed data initialization.
2. Gemini AI extraction on a messy Hinglish customer message:
   - Validates that customer items, quantities, and cake inscriptions are extracted.
   - Validates that missing customer email and missing delivery address trigger **Needs Attention** yellow alerts.
3. Simulating seller review and order approval.
4. Calling PayPal Sandbox Invoicing API (`POST /v2/invoicing/invoices`) to generate a draft invoice.
5. Calling PayPal Sandbox Invoicing API (`GET /v2/invoicing/invoices/{id}`) to verify live details.
6. Sending the invoice via PayPal Sandbox (`POST /v2/invoicing/invoices/{id}/send`) and verifying the generated payer payment link.
7. Querying the AI business assistant with real-time SQLite financial figures.

---

## 🎯 Hackathon Demonstration Walkthrough

Follow this step-by-step path to demonstrate SakhiDesk to judges:

### Step 1: Open the Welcome Dashboard (`/`)
- View the warm, elegant interface tailored for home entrepreneurs.
- Note the metric cards: **Total Paid Revenue** ($50.00 confirmed), **Pending Payments** ($35.00), and **Total Orders**.
- Note the clear distinction between **Demo Data** and **Live PayPal Sandbox** badges.
- Check the **Monthly Revenue Chart** and **Recent Customer Activity** feed.
- Switch the language toggle at the top right to **हिन्दी** or **Hinglish** to show localized experience.

### Step 2: Extract an Order with AI (`/create-order`)
- Click **+ Create Order with AI** in the top navigation or banner.
- Choose from the 3 one-click sample scenarios at the top, for example:
  > *"Hi didi, mujhe kal ke liye 2 chocolate cakes chahiye, 1 kg each. One cake should have Happy Birthday Aanya written on it. Total price kitna hoga? Delivery tomorrow evening at 6."*
- Click **Extract Order with AI**.
- Watch Gemini AI extract:
  - Product: Chocolate Cake
  - Quantity: 2
  - Customization: *1 kg each; Happy Birthday Aanya*
  - Delivery: Tomorrow evening at 6:00 PM
- Notice the **⚠️ Needs Attention (Yellow Warning)**:
  - Customer email is missing (required to send PayPal invoice).
  - Price verification needed.

### Step 3: Seller Approval & Confirmation
- Enter the customer's email address (e.g. `sb-buyer@personal.example.com`).
- Verify or adjust the unit price ($25.00 each = $50.00 total).
- Click **Confirm Order & Proceed**.
- The order is confirmed in the database with status `CONFIRMED`.

### Step 4: Real PayPal Sandbox Invoicing (`/invoices`)
- Click **Create Real PayPal Draft Invoice**.
- SakhiDesk calls the live PayPal REST Invoicing API (`POST /v2/invoicing/invoices`).
- Note the generated PayPal Invoice ID (e.g. `INV2-...`) and sequential invoice number.
- Click **Send Invoice via PayPal**.
- PayPal sends the invoice and generates a real payment URL (`https://www.sandbox.paypal.com/invoice/p/#...`).
- Click **Refresh Live Status** — SakhiDesk calls `GET /v2/invoicing/invoices/{id}` directly from PayPal Sandbox to ensure status integrity.
- Notice: Invoices are never marked `PAID` until confirmed by PayPal.

### Step 5: Customer & Order Management (`/orders` & `/customers`)
- Navigate to **Orders** to see search, filter by status, and order details drawer preserving the original customer message alongside seller-approved data.
- Navigate to **Customers** to see lifetime spending, order history, and contact shortcuts.

### Step 6: Mini-Shop Catalog (`/shop` and `/shop/storefront`)
- Click **Mini Shop** in the sidebar.
- Click **Copy Shop Link** or **Preview Public Storefront**.
- See the customer-facing catalog for *"Pooja's Artisan Delights & Boutique"*.
- Add an item to the order request and submit as a customer.
- Return to the SakhiDesk dashboard to see the request appear in the seller review queue with status `NEW`.

### Step 7: AI Business Assistant (`/assistant`)
- Open **AI Assistant** in the sidebar.
- Click the suggestion: *"How much confirmed revenue have I earned this month?"*
- Observe how Sakhi responds with exact numbers ($50.00) based strictly on stored records without hallucinating.

### Step 8: WhatsApp Marketing Generator (`/reminders`)
- Navigate to **Reminders & Marketing**.
- Select a product (e.g. *Custom Birthday Chocolate Cake*).
- Select language: **Hinglish** and tone: **Festive ✨**.
- Click **Generate WhatsApp Promo Message**.
- Click **Open WhatsApp with Message Prefilled** or **Copy Message**.

---

## 🔒 Security & Payment Safety
- **No Client Secrets Exposed**: All PayPal REST API calls and Gemini API interactions run strictly on the backend.
- **Duplicate Prevention**: Idempotency checks prevent creating duplicate invoices if a seller clicks twice.
- **Strict Financial Accounting**: Revenue metrics are computed strictly from invoices confirmed as `PAID` by PayPal.

---

## 📄 License
Built with ❤️ for women entrepreneurs and the hackathon demonstration.

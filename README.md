# SakhiDesk

**Your business best friend, in any language.**

An AI order-to-invoice assistant for home-based sellers. Built in India 🇮🇳, made for sellers everywhere.

- **Live demo:** https://sakhidesk.onrender.com
- **Demo video:** Coming soon

## The problem

Home bakers, tailors and craft sellers receive orders through chat messages, notes and calls, often in different languages. Turning each order into a structured record, invoice and payment record takes time and manual effort.

## What SakhiDesk does

- **AI order reading:** Paste a customer message and Gemini extracts structured order details, including items, quantities and prices. Tested with English, Hinglish and Korean.
- **Seller approval:** Review extracted order details and resolve missing information before creating an invoice.
- **PayPal invoices:** Create, send and track PayPal invoices, share payment links and check payment status.
- **Mini Shop:** Manage a small product catalog and let customers submit order requests through a buyer-facing shop.
- **Business records:** Track paid online sales and manually recorded offline sales, with monthly CSV export for bookkeeping.
- **AI Assistant:** Get help with questions about the seller's orders and the app.

## How PayPal and AI are used

- **PayPal:** PayPal Invoicing REST API v2 (Sandbox), using OAuth 2.0 client credentials to create and send invoices and retrieve payment status.
- **AI:** Gemini API for text-based order extraction and the in-app AI Assistant.

## Tech stack

Next.js 14, React 18, TypeScript, Tailwind CSS, SQLite (better-sqlite3), Recharts, Gemini API, PayPal Sandbox Invoicing API and Render.

Built with AI-assisted coding tools, including Antigravity and TRAE.

## Run locally

Requires Node.js 22 or newer (tested with Node.js 24).

1. Clone the repository:

   `git clone https://github.com/shambhavivartika06-cmyk/SakhiDesk.git`

2. Open the project folder:

   `cd SakhiDesk`

3. Install dependencies:

   `npm install`

4. Copy `.env.example` to `.env.local` and add your own API credentials:
   - `GEMINI_API_KEY` from Google AI Studio.
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a PayPal Sandbox app.

5. Start the development server:

   `npm run dev`

6. Open `http://localhost:3000`.

The database is initialized automatically with demo data on first start.

## Try the PayPal flow (Sandbox)

1. Open **Create Order with AI** and paste an order, for example: `I want 2 chocolate cakes for $50`.
2. Review the extracted details and save the order.
3. Create and send a PayPal invoice using a supported customer email.
4. Open the payment link and sign in using a PayPal Sandbox personal account.
5. Complete the test payment and refresh the invoice status to see it marked as **Paid**.

## Known limits

- **Sandbox only:** No real money is transferred.
- **PayPal availability:** PayPal Invoicing has country and account restrictions. The India-based merchant/customer combination used in testing was not supported by the Sandbox flow.
- **Free hosting:** The hosted demo uses Render's free tier. It may sleep after inactivity, so the first load can take about a minute.
- **Database persistence:** The hosted demo uses local SQLite storage on Render's free service. Data may reset when the service restarts. Demo data reloads automatically.
- **Single-seller demo:** The current app is designed as a single-seller demonstration.
- Voice input and the reminders page exist in the code but are hidden in the current UI.

## Future improvements

PostgreSQL storage, PayPal webhooks for faster payment updates, local payment options for domestic customers, multi-seller support and additional languages.

## License

MIT License. See [LICENSE](LICENSE).
# Commandi

Order management for Tunisian cash-on-delivery shops that sell on Facebook, Instagram and WhatsApp.

- **Paste chat → order**: AI reads Darija (Arabic or Latin script), French or Arabic and fills name, phone, governorate, address and products.
- **Confirm on WhatsApp**: one tap opens WhatsApp with a ready confirmation message (editable template).
- **Risky buyer alert**: phones with refused/cancelled parcels are flagged before you ship.
- **Real profit**: cash collected minus product cost, delivery fees and fees lost on returns.
- **CSV export** for delivery companies (opens in Excel with Arabic intact).
- English + Arabic (RTL), light/dark, mobile-first.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase and at least one AI key.
3. In the Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`.
4. `npm run dev` and open http://localhost:3000

Money is stored as integer millimes (1 TND = 1000). Phones are stored as 8 local digits.

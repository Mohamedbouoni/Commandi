# Commandi Roadmap

Goal: the app every Tunisian Instagram/Facebook seller opens first thing in the
morning, because it saves them money on refused parcels and time on DMs.

## Already built (MVP)
- Paste a chat → AI fills the order (Darija, French, Arabic)
- Order list with statuses (new → confirmed → shipped → delivered / returned)
- One-tap WhatsApp confirmation with a custom message
- Risky-buyer badge (this shop's history only)
- Products with price and cost, monthly profit report, CSV export
- English + Arabic, dark mode

## Phase 1 — "Stop losing money" (building now)
1. **Commandi Shield (shared blacklist).** Every shop sees how a phone number
   behaved at *other* shops (delivered vs refused), counts only, never shop
   names or customer details. This is the feature that sells the app.
2. **Store link for the Instagram bio.** `commandi.tn/s/your-shop`: the buyer
   picks products and fills name, phone, address. The order lands in the
   dashboard as "new", already checked against the Shield.
3. **Stock tracking.** Optional stock per product; goes down when an order
   ships, comes back on return. "Out of stock" hides it from the store link.
4. **Bulk actions + delivery labels.** Select many orders → change status or
   print labels (name, phone, address, COD amount, items) for the courier.

## Phase 2 — "Save time"
5. **Daily follow-up list.** Orders not confirmed after 24h, shipped for more
   than 5 days with no update, buyers to call back.
6. **Courier integration.** Send parcels to Tunisian delivery companies
   (First Delivery, Navex, Intigo, Aramex…) and pull tracking status
   automatically instead of updating by hand.
7. **Team access.** Invite a "confirmatrice" who can confirm orders but not
   see profit.
8. **Product photos + variants** (size, color) on the store link.

## Phase 3 — "Grow and get paid"
9. **Instagram/WhatsApp DM bot** answering price/availability in Darija and
   creating orders (needs Meta business API approval).
10. **Paid plans via Konnect** (TND): Free up to 50 orders/month, Pro with
    Shield, store link and labels unlimited.
11. **Stats that sell the app:** return rate per governorate, best products,
    best hour to post, money saved by Shield.
12. **Other COD markets:** Morocco, Algeria, Egypt (phone formats, regions,
    dialect prompts).

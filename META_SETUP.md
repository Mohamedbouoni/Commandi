# Putting Commandi online + connecting Messenger and Instagram

Follow the parts in order. Each one ends with a check so you know it worked.

---

## Part A — Put Commandi online (Vercel, free)

1. Go to https://vercel.com and sign in **with GitHub** (the account that owns
   `Mohamedbouoni/Commandi`).
2. **Add New → Project →** pick **Commandi → Import**.
3. Open **Environment Variables** and add these (copy the values from your
   `commandi/.env.local`, never from chat):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://witfcbcctwwtlngeyepg.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `sb_publishable_…` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your `sb_secret_…` key |
   | `GROQ_API_KEY` / `GEMINI_API_KEY` | same as `.env.local` (the AI that reads chats) |
   | `META_VERIFY_TOKEN` | the value in `.env.local` |
   | `META_APP_ID`, `META_APP_SECRET` | leave empty for now — filled in Part C |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | the email shops and customers can write to |

4. Click **Deploy**. After 1–2 minutes you get an address like
   `https://commandi-xxxx.vercel.app`.
5. Add one more variable: `NEXT_PUBLIC_APP_URL` = that address, then
   **Deployments → ⋯ → Redeploy**.

✅ **Check:** open `https://<your-address>/privacy` — the privacy page shows.

## Part B — Tell Supabase about the new address

1. Supabase → **Commendi** → **SQL Editor → New query** → paste
   `supabase/migrations/003_meta_events.sql` → **Run**.
2. **Authentication → URL Configuration**:
   - **Site URL** = `https://<your-address>`
   - **Redirect URLs** → add `https://<your-address>/**`

✅ **Check:** log in on the online address with your account — you see your
orders.

---

## Part C — Create the Meta app

You need: a **Facebook Page** for the shop, and an **Instagram professional
account** (Business or Creator) **linked to that Page**
(Instagram → Settings → Account type and tools / Meta Business Suite →
Settings → Instagram accounts).

1. Go to https://developers.facebook.com → **My Apps → Create App**.
2. Name: **Commandi**. Contact email: yours.
3. Use cases: choose **"Engage with customers on Messenger from Meta"**
   and also **"Manage messaging & content on Instagram"**.
4. Connect it to your **Business portfolio** (create one if asked).
5. **App settings → Basic**:
   - **Privacy Policy URL** = `https://<your-address>/privacy`
   - **User data deletion → Data deletion instructions URL** =
     `https://<your-address>/data-deletion`
   - **App domains** = `<your-address>` (without https://)
   - Copy **App ID** and **App secret** (click *Show*) → put them in Vercel as
     `META_APP_ID` and `META_APP_SECRET` → **Redeploy**.

✅ **Check:** the app dashboard shows both use cases.

## Part D — Webhook (how new messages reach Commandi)

1. In the app: **Messenger API settings** (under the Messenger use case) →
   **Configure webhooks**:
   - **Callback URL** = `https://<your-address>/api/meta/webhook`
   - **Verify token** = your `META_VERIFY_TOKEN`
   - Click **Verify and save**.
2. **Generate access tokens → Connect** your Facebook Page, then under
   **Webhook subscriptions** for the Page tick: `messages`,
   `messaging_postbacks`.
3. Do the same in **Instagram API settings**: same Callback URL and Verify
   token, connect your Instagram account, subscribe to `messages`.

✅ **Check:** from **another** Facebook account that is added to the app as a
**Tester** (App roles → Roles), send a message to your Page. Tell Claude — it
will confirm the message arrived in Commandi's event log.

> While the app is in **Development mode**, Meta only delivers messages from
> people who have a role on the app (admin, developer, tester). Real customers
> work after **App Review** (Part E).

---

## Part E — Later: App Review (before real shops connect)

Needed once the inbox (step 2) is built, because the review needs a screen
recording of Commandi using each permission:

- Business verification of your Business portfolio (company documents).
- Permissions to request: `pages_messaging`, `pages_manage_metadata`,
  `pages_show_list`, `instagram_basic`, `instagram_manage_messages`.
- A short video per permission + a test account for the reviewer.

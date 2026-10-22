import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy — Commandi" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="22 October 2026"
      arabicSummary="كوماندي يساعد المتاجر على إدارة الطلبات والرسائل. نجمع فقط ما يلزم لتشغيل الخدمة: معلومات المتجر، الطلبات، والرسائل التي يربطها البائع من فيسبوك وإنستغرام. لا نبيع بياناتك أبداً، ويمكنك طلب حذفها في أي وقت."
      sections={[
        {
          title: "Who we are",
          body: (
            <p>
              Commandi is an order-management tool for online shops in Tunisia. Shops use it to receive customer
              messages, turn them into cash-on-delivery orders and track deliveries.
            </p>
          ),
        },
        {
          title: "What we collect",
          body: (
            <ul className="list-disc ps-5">
              <li>Shop accounts: email address, shop name and settings.</li>
              <li>Orders entered by the shop or placed on its store link: customer name, phone, address and items.</li>
              <li>
                Messages from Facebook Messenger and Instagram, only for Pages and accounts a shop connects:
                sender ID, name, message text and attachments, and timestamps.
              </li>
            </ul>
          ),
        },
        {
          title: "How we use it",
          body: (
            <ul className="list-disc ps-5">
              <li>To show a shop its conversations and let it reply to its customers.</li>
              <li>To suggest replies and fill in orders with AI, for the shop that owns the conversation.</li>
              <li>
                Commandi Shield: shops see how many parcels a phone number delivered or refused across shops.
                Only counts are shared — never names, addresses, messages or which shop it was.
              </li>
            </ul>
          ),
        },
        {
          title: "What we never do",
          body: (
            <p>
              We do not sell data, show ads, or use messages for anything other than providing the service to the
              shop that received them.
            </p>
          ),
        },
        {
          title: "Storage and retention",
          body: (
            <p>
              Data is stored with our database provider (Supabase) and kept while the shop account is active. When a
              shop disconnects a Page or deletes its account, the related messages are deleted.
            </p>
          ),
        },
        {
          title: "Your rights",
          body: (
            <p>
              You can ask for a copy of your data or its deletion at any time. See{" "}
              <a href="/data-deletion" className="font-semibold underline">Data deletion</a>.
            </p>
          ),
        },
      ]}
    />
  );
}

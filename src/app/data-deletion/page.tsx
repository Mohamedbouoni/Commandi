import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Data deletion — Commandi" };

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data deletion"
      updated="22 October 2026"
      arabicSummary="لحذف بياناتك: البائع يمكنه فصل صفحته أو حذف حسابه من الإعدادات. الزبون الذي راسل متجراً يمكنه مراسلتنا عبر البريد وسنحذف رسائله خلال 30 يوماً."
      sections={[
        {
          title: "If you are a shop",
          body: (
            <ol className="list-decimal ps-5">
              <li>Open Commandi → Settings and disconnect your Facebook Page or Instagram account. Its messages are deleted.</li>
              <li>To delete everything, email us from your account address and we delete the account within 30 days.</li>
              <li>
                You can also remove Commandi in Facebook: Settings &amp; privacy → Settings → Business integrations →
                Commandi → Remove.
              </li>
            </ol>
          ),
        },
        {
          title: "If you messaged a shop that uses Commandi",
          body: (
            <p>
              Email us{CONTACT_EMAIL ? ` at ${CONTACT_EMAIL}` : ""} with the name of the shop and the Facebook or
              Instagram account you used. We delete your messages and confirm within 30 days.
            </p>
          ),
        },
      ]}
    />
  );
}

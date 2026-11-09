import { CONTACT } from "@asotech/configuration";
import { Alert } from "@asotech/ui";
import { Container } from "../../../components/layout";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <Container className="max-w-3xl py-14">
      <h1 className="text-3xl font-extrabold text-navy">Terms of service</h1>
      <p className="mt-1 text-sm text-slate2">Last updated: 5 November 2026</p>
      <div className="mt-6"><Alert tone="warn" title="Draft for legal review">These terms are a draft and should be reviewed by a qualified lawyer before launch.</Alert></div>
      <div className="space-y-5 text-slate2">
        <h2 className="text-xl font-extrabold text-navy">1. About these terms</h2>
        <p>These terms govern your use of the ASOTECH Business Advisory website and applications. Consulting and development engagements are governed by the proposal, statement of work or agreement signed for that engagement, which prevails if it conflicts with these terms.</p>
        <h2 className="text-xl font-extrabold text-navy">2. Website information</h2>
        <p>Website content is general information and not professional legal, tax or accounting advice. Regulated services are delivered through appropriately qualified professionals or authorised partners where required.</p>
        <h2 className="text-xl font-extrabold text-navy">3. Accounts</h2>
        <p>You are responsible for keeping credentials confidential and for activity under your account. You must provide accurate information and not misuse the service or attempt to access another organisation&apos;s data.</p>
        <h2 className="text-xl font-extrabold text-navy">4. Subscriptions and fees</h2>
        <p>Subscription plans, prices and billing terms will be stated when plans are offered. Fees for consulting and development are set out in the applicable proposal.</p>
        <h2 className="text-xl font-extrabold text-navy">5. Your data</h2>
        <p>You retain ownership of the data you enter. We process it to provide the service as described in our privacy policy, and apply security controls including tenant isolation and audit logging.</p>
        <h2 className="text-xl font-extrabold text-navy">6. Availability and liability</h2>
        <p>We work to keep services available but do not guarantee uninterrupted operation. To the extent permitted by law, our liability is limited as set out in the applicable agreement.</p>
        <h2 className="text-xl font-extrabold text-navy">7. Governing law</h2>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
        <h2 className="text-xl font-extrabold text-navy">8. Contact</h2>
        <p><a className="font-semibold text-navy underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
      </div>
    </Container>
  );
}

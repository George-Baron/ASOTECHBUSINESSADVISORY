import { CONTACT } from "@asotech/configuration";
import { Alert } from "@asotech/ui";
import { Container } from "../../../components/layout";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <Container className="max-w-3xl py-14">
      <h1 className="text-3xl font-extrabold text-navy">Privacy policy</h1>
      <p className="mt-1 text-sm text-slate2">Last updated: 5 November 2026</p>
      <div className="mt-6"><Alert tone="warn" title="Draft for legal review">This policy is a draft and should be reviewed by a qualified lawyer before launch.</Alert></div>
      <div className="space-y-5 text-slate2">
        <p>ASOTECH Business Advisory (&ldquo;ASOTECH&rdquo;, &ldquo;we&rdquo;) respects your privacy and processes personal data in line with the Nigeria Data Protection Act 2023 (NDPA) and other applicable law.</p>
        <h2 className="text-xl font-extrabold text-navy">What we collect</h2>
        <p>When you submit a contact, consultation or proposal form we collect the details you provide: name, email, phone, company, preferred meeting times and the description of your needs. When you use our applications we also process account information and the business data you enter. We do not record your IP address in our forms.</p>
        <h2 className="text-xl font-extrabold text-navy">How we use it</h2>
        <p>We use your information to respond to your request, provide and support our services, manage accounts and billing, keep our systems secure, and meet legal obligations. Our lawful bases include your consent, performance of a contract and our legitimate interests.</p>
        <h2 className="text-xl font-extrabold text-navy">Sharing</h2>
        <p>We do not sell personal data. We share it only with service providers that help us operate (for example hosting, database, email and payment providers) under appropriate safeguards, or where the law requires.</p>
        <h2 className="text-xl font-extrabold text-navy">Security and retention</h2>
        <p>We use access controls, tenant isolation, encryption in transit and audit logging. We keep personal data only as long as needed for the purposes above or as required by law.</p>
        <h2 className="text-xl font-extrabold text-navy">Your rights</h2>
        <p>Under the NDPA you may request access to, correction of, or deletion of your personal data, object to or restrict processing, and withdraw consent. You may also complain to the Nigeria Data Protection Commission.</p>
        <h2 className="text-xl font-extrabold text-navy">Contact</h2>
        <p>Questions or requests: <a className="font-semibold text-navy underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
      </div>
    </Container>
  );
}

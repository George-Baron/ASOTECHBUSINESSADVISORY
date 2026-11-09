import { Alert, Field, Input, Select, Textarea, Button } from "@asotech/ui";
import { SERVICES } from "@asotech/business-logic";
import { CONTACT } from "@asotech/configuration";
import { submitConsultation, submitProposal, submitContact } from "../app/(forms)/actions";

interface Status { sent?: string; error?: string }

function Honeypot({ returnTo }: { returnTo: string }) {
  return (
    <>
      {/* Honeypot: hidden from people, tempting to bots */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website_url">Leave this field empty</label>
        <input id="website_url" name="website_url" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="_t" value={String(Date.now())} />
      <input type="hidden" name="return_to" value={returnTo} />
    </>
  );
}

function Banner({ status, thanks }: { status: Status; thanks: string }) {
  if (status.sent) return <Alert tone="ok" title="Thank you">{thanks}</Alert>;
  if (status.error) return <Alert tone="bad" title="We could not submit that">{status.error}</Alert>;
  return null;
}

function ServiceSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select id="service_slug" name="service_slug" defaultValue={defaultValue ?? ""}>
      <option value="">Not sure yet</option>
      {SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
    </Select>
  );
}

export function ConsultationForm({ status, defaultService, compact, returnTo = "/consultation" }: { status: Status; defaultService?: string; compact?: boolean; returnTo?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={submitConsultation} className="relative space-y-4" aria-label="Consultation request">
      <Banner status={status} thanks={`We have received your request and will be in touch. You can also reach us at ${CONTACT.email}.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="full_name"><Input id="full_name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" /></Field>
        <Field label="Email" name="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Phone" name="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+234" /></Field>
        <Field label="Company" name="company"><Input id="company" name="company" maxLength={200} autoComplete="organization" /></Field>
        <div className="sm:col-span-2"><Field label="Service of interest" name="service_slug"><ServiceSelect defaultValue={defaultService} /></Field></div>
        {!compact && (
          <>
            <Field label="Preferred date" name="preferred_date"><Input id="preferred_date" name="preferred_date" type="date" min={today} /></Field>
            <Field label="Preferred time" name="preferred_time">
              <Select id="preferred_time" name="preferred_time" defaultValue=""><option value="">No preference</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="How would you like to meet?" name="meeting_mode">
                <Select id="meeting_mode" name="meeting_mode" defaultValue="video"><option value="video">Video call</option><option value="phone">Phone call</option><option value="in_person">In person</option></Select>
              </Field>
            </div>
          </>
        )}
        <div className="sm:col-span-2"><Field label="What would you like help with?" name="message"><Textarea id="message" name="message" maxLength={5000} className={compact ? "min-h-[90px]" : undefined} /></Field></div>
      </div>
      <Honeypot returnTo={returnTo} />
      <Button type="submit" size="lg">Request consultation</Button>
      <p className="text-xs text-slate2">We use your details only to respond to this request. See our <a className="underline" href="/privacy">privacy policy</a>.</p>
    </form>
  );
}

export function ProposalForm({ status, defaultService }: { status: Status; defaultService?: string }) {
  return (
    <form action={submitProposal} className="relative space-y-4" aria-label="Proposal request">
      <Banner status={status} thanks={`We have received your proposal request. We will review it and respond, usually with follow-up questions.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="full_name"><Input id="full_name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" /></Field>
        <Field label="Email" name="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Phone" name="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+234" /></Field>
        <Field label="Company" name="company"><Input id="company" name="company" maxLength={200} autoComplete="organization" /></Field>
        <div className="sm:col-span-2"><Field label="Service" name="service_slug"><ServiceSelect defaultValue={defaultService} /></Field></div>
        <Field label="Budget range (optional)" name="budget_range" hint="For example: to be discussed"><Input id="budget_range" name="budget_range" maxLength={60} /></Field>
        <Field label="Timeline (optional)" name="timeline" hint="For example: start within 2 months"><Input id="timeline" name="timeline" maxLength={60} /></Field>
        <div className="sm:col-span-2"><Field label="Scope of work" name="scope" hint="Describe the business, what you need, and what success looks like."><Textarea id="scope" name="scope" required minLength={10} maxLength={8000} className="min-h-[160px]" /></Field></div>
      </div>
      <Honeypot returnTo="/proposal" />
      <Button type="submit" size="lg">Request proposal</Button>
    </form>
  );
}

export function ContactForm({ status }: { status: Status }) {
  return (
    <form action={submitContact} className="relative space-y-4" aria-label="Contact form">
      <Banner status={status} thanks="Your message has been sent. We will reply as soon as we can." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="full_name"><Input id="full_name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" /></Field>
        <Field label="Email" name="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Phone (optional)" name="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" /></Field>
        <Field label="Subject (optional)" name="subject"><Input id="subject" name="subject" maxLength={200} /></Field>
        <div className="sm:col-span-2"><Field label="Message" name="message"><Textarea id="message" name="message" required minLength={5} maxLength={5000} /></Field></div>
      </div>
      <Honeypot returnTo="/contact" />
      <Button type="submit" size="lg">Send message</Button>
    </form>
  );
}

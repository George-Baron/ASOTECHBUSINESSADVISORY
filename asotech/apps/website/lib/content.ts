import { BRAND } from "@asotech/configuration";

export const NAV = [
  { href: "/services", label: "Services" },
  { href: "/industries", label: "Industries" },
  { href: "/technology", label: "Technology" },
  { href: "/pricing", label: "Pricing" },
  { href: "/insights", label: "Insights" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const INDUSTRIES = [
  { slug: "retail", name: "Retail & Wholesale", text: "Accurate shelf and store-room stock, reliable POS-to-inventory flow, and reports that show what is selling and what is missing.", help: ["POS and inventory setup across branches", "Barcode and product master data cleanup", "Stocktaking and shrinkage investigation"] },
  { slug: "pharmacy", name: "Pharmacies & Health Supplies", text: "Batch, expiry and FEFO control so stock that expires first is sold first, with clear records for every movement.", help: ["Batch and expiry tracking", "FEFO picking rules and near-expiry reporting", "Stock audits and reconciliation"] },
  { slug: "supermarkets", name: "Supermarkets & Mini-Marts", text: "High-volume, multi-category stock with frequent price and supplier changes needs disciplined counts and controls.", help: ["Cycle counting programmes", "Receiving and supplier-delivery controls", "Variance analysis by category"] },
  { slug: "warehousing", name: "Warehousing & Distribution", text: "Bin locations, stock movements and replenishment rules that keep goods findable and records trustworthy.", help: ["Warehouse and bin-location design", "Transfer and dispatch controls", "Replenishment and demand planning support"] },
  { slug: "hospitality", name: "Hospitality & Food Service", text: "Control of kitchen, bar and store-room stock, portioning and purchasing so cost of sales stays visible.", help: ["Store-room and outlet stock control", "Purchasing and approval workflow", "Management reporting"] },
  { slug: "manufacturing", name: "Light Manufacturing & Trading", text: "Raw materials, finished goods and purchasing in one structured process with clear ownership.", help: ["Procurement and supplier management", "ERP systems selection and implementation", "Inventory costing support"] },
  { slug: "education-ngo", name: "Education, NGOs & Institutions", text: "Asset and consumables control, approval workflows and reporting for organisations that answer to boards and funders.", help: ["Organisational structure and SOPs", "HR and administrative workflow design", "Reporting and internal controls"] },
];

export const PROCESS = [
  { step: "01", name: "Discover", text: "We learn how your business actually runs: people, stock, systems, reports and pain points. We agree the outcomes that matter." },
  { step: "02", name: "Design", text: "We design the processes, controls and systems that fit, and show you the plan, scope and responsibilities before work begins." },
  { step: "03", name: "Deliver", text: "We implement, configure, build, migrate data and train your team, with regular check-ins and documented deliverables." },
  { step: "04", name: "Support", text: "We stay available after go-live with support, periodic reviews and improvements as your business grows." },
];

export const BENEFITS = [
  { name: "One partner, end to end", text: "Business setup, process design, software, inventory and audit from a single team, so nothing falls between suppliers." },
  { name: "Control you can see", text: "Approval workflows, audit trails and an inventory ledger that records every movement, so you can trace what happened and who did it." },
  { name: "Accuracy first", text: "Structured stocktaking, reconciliation and master-data cleanup so reports can be trusted." },
  { name: "Built for Nigerian businesses", text: "Local currency, local operating realities, and an approach that scales to international clients." },
  { name: "Technology that fits", text: "We recommend what suits your size and budget, including low-code tools, ERP systems or custom software." },
  { name: "Clear documentation", text: "Plain-language SOPs, handover documents and training so your team can run the system without us." },
];

export const TECH = [
  { name: "ASOTECH Inventory", text: "Cloud inventory management with a stock movement ledger, stocktaking, reconciliation, approvals, batch and expiry control.", tag: "Product" },
  { name: "POS & inventory integration", text: "Connect point-of-sale and stock so sales, receipts and transfers update one source of truth.", tag: "Prepared" },
  { name: "ERP systems integration", text: "Integration capability for products, stock balances, movements and approved adjustments with your ERP system.", tag: "Prepared" },
  { name: "Mobile stocktaking", text: "AppSheet-based barcode counting for floor teams, feeding counts into the central reconciliation workflow.", tag: "Prepared" },
  { name: "Client portal", text: "A secure place for clients to follow projects, read reports, review audit findings and approve deliverables.", tag: "Product" },
  { name: "Business dashboards", text: "Management reporting and dashboards that turn operational data into decisions.", tag: "Service" },
];

export const SERVICE_ROUTE = (slug: string) => `/${slug}`;

export const REGULATED_NOTE =
  "Regulated registration, legal, tax, audit or other professional services are performed through appropriately qualified professionals or authorised partners where required.";

export const STRAPLINE = BRAND.strapline;

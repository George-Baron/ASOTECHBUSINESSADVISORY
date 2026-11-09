export interface ArticleBlock { h?: string; p?: string; list?: string[] }
export interface Article { slug: string; title: string; summary: string; date: string; readMinutes: number; body: ArticleBlock[] }

export const AUTHOR = "ASOTECH Business Advisory";

export const ARTICLES: Article[] = [
  {
    slug: "how-to-run-a-stocktake",
    title: "How to run a stocktake that you can trust",
    summary: "A practical, step-by-step approach to physical counts: preparation, counting, recounts and sign-off.",
    date: "2026-11-05", readMinutes: 6,
    body: [
      { p: "A stocktake is only useful if the number you end up with is more reliable than the one you started with. Most failed stocktakes fail before counting begins, because the business was still receiving, selling or moving stock while people counted. This guide sets out a method that works for a single shop or a multi-branch warehouse." },
      { h: "1. Prepare before the count day", list: ["Decide the scope: whole business, one warehouse, or selected locations and products.", "Clean the product list: remove duplicates, fix descriptions and confirm barcodes.", "Label every shelf, bin or zone so counters know exactly where they are.", "Appoint a count lead, counters and an independent checker who does not count the same area.", "Agree a cut-off: no receiving, dispatch or transfers during the count, or record them separately."] },
      { h: "2. Take a system snapshot", p: "Record what the system says you hold at the start of the count. This is the baseline against which variances are calculated. If the system keeps changing during the count, you cannot tell a miscount from a late transaction." },
      { h: "3. Count blind where possible", p: "Counters who can see the system quantity tend to count towards it. A blind count, where counters record only what they physically see, produces more honest numbers. Count in full units, include damaged and quarantined stock separately, and record batch numbers and expiry dates where they matter." },
      { h: "4. Recount the differences", p: "Compare counts with the snapshot. For every line that differs by more than an agreed tolerance, ask a different person to recount. Keep the original count and every recount; never overwrite them. The history is evidence if anyone later asks how a number was reached." },
      { h: "5. Investigate before you adjust", p: "Before changing the stock record, look for the cause: unrecorded transfers, goods received but not entered, returns, wrong units of measure, or mixed-up products. Fixing causes is worth more than fixing numbers, because the same errors will otherwise return." },
      { h: "6. Approve and post adjustments", p: "Adjustments should be reviewed and approved by someone other than the person who prepared them, with a reason recorded for each variance. Post the approved adjustment to the stock ledger and keep the count sheets, recounts and approval together as the stocktake file." },
      { h: "7. Report and improve", p: "Summarise accuracy (the share of lines that matched), the value of overs and shortages, the main causes found, and the corrective actions with owners and dates. A short, regular cycle count of high-value or fast-moving items between full counts keeps accuracy from drifting." },
    ],
  },
  {
    slug: "reconciling-stock-variances",
    title: "Reconciling stock variances: finding the cause, not just the number",
    summary: "How to investigate differences between counted and recorded stock and decide what to adjust.",
    date: "2026-11-05", readMinutes: 5,
    body: [
      { p: "A variance is the difference between what you counted and what the system says you should have. Reconciliation is the discipline of explaining that difference before you change anything." },
      { h: "Start with the largest and the oddest", p: "Rank variances by value and by percentage. The biggest values matter financially; unusual patterns, such as the same product short in several branches, point to process problems." },
      { h: "Common causes to check", list: ["Receipts not yet entered, or entered twice.", "Transfers between locations or branches recorded on one side only.", "Sales or issues recorded against the wrong product, size or unit of measure.", "Returns and damaged goods not processed.", "Duplicate products with different SKUs or barcodes.", "Counting errors: wrong shelf, missed bins, partial boxes."] },
      { h: "Use the stock movement history", p: "A complete movement ledger lets you trace a product back through receipts, sales and transfers. If the ledger shows a transfer out with no matching transfer in, you have found a reconciling item rather than a loss." },
      { h: "Classify every variance", p: "Give each adjusted line a reason such as miscount, damage, expiry, receiving error, issue error, unrecorded transfer or data error. Over time, the mix of reasons tells you where controls are weakest." },
      { h: "Separate approval from preparation", p: "The person who prepares the adjustment should not approve it. Approval with a recorded note protects the business and the staff involved." },
      { h: "Keep the evidence", p: "Retain the original count, recounts, investigation notes and approval. If an auditor, owner or investor asks about a number later, the file should answer for you." },
    ],
  },
  {
    slug: "fefo-explained",
    title: "FEFO explained: sell what expires first",
    summary: "What First-Expired-First-Out means, when to use it instead of FIFO, and what you need in place to run it.",
    date: "2026-11-05", readMinutes: 4,
    body: [
      { p: "FEFO stands for First Expired, First Out. Instead of selling the oldest delivery first (FIFO), you sell the batch with the nearest expiry date first. It matters wherever goods can expire: pharmaceuticals, food, beverages, cosmetics and some chemicals." },
      { h: "Why FIFO is not enough", p: "A later delivery can have a shorter shelf life than an earlier one. If staff pick purely by arrival date, the shorter-dated batch can expire on the shelf while longer-dated stock is sold." },
      { h: "What you need to run FEFO", list: ["Batch or lot numbers recorded at receiving.", "Expiry dates captured for every batch.", "Stock held by batch and by location, not just by product.", "A pick list or system that suggests the earliest-expiring batch that is not already expired.", "A regular near-expiry report so slow-moving short-dated stock can be promoted, returned or written off in time."] },
      { h: "Rules that keep it working", list: ["Never allocate expired stock; move it to a quarantine location.", "Receive with a minimum remaining shelf-life check where suppliers vary.", "Count by batch during stocktakes so discrepancies show which batch is affected."] },
      { h: "Start small", p: "If you cannot track every product by batch immediately, begin with the highest-risk lines and expand. The aim is a repeatable habit: record the batch, record the expiry, and pick the earliest first." },
    ],
  },
  {
    slug: "preparing-for-an-erp-system",
    title: "Preparing your business for an ERP system",
    summary: "Seven things to settle before you choose or configure an ERP system, so implementation goes smoothly.",
    date: "2026-11-05", readMinutes: 6,
    body: [
      { p: "An ERP system brings inventory, purchasing, sales, accounting and HR into one platform. It does not fix unclear processes; it makes them faster. The businesses that benefit most prepare before implementation begins." },
      { h: "1. Write down how you work today", p: "Map the real process for ordering, receiving, selling, paying and reporting, including the workarounds. You cannot improve or configure what nobody has described." },
      { h: "2. Decide what you want to fix", p: "List the specific problems: stock inaccuracy, slow month-end, no branch visibility, approval delays. These become your success measures and keep the project focused." },
      { h: "3. Clean your master data", p: "Products, customers, suppliers and opening balances move into the new system. Duplicates, missing barcodes and inconsistent units of measure become expensive problems later. Cleaning data before migration is cheaper than after." },
      { h: "4. Assign owners", p: "Each area needs a business owner, not just an IT contact. Someone from stores, purchasing, finance and HR should help decide how the system will work." },
      { h: "5. Define roles and approvals", p: "Decide who can create, approve and post what. Segregation of duties should be designed in from the start." },
      { h: "6. Plan data migration and go-live", p: "Agree the cut-over date, how opening stock and balances will be verified, and what happens to transactions in progress. A stocktake close to go-live gives a trustworthy opening position." },
      { h: "7. Budget for training and support", p: "Training and the first weeks after go-live determine whether staff adopt the system. Plan time for both, and confirm what vendor support and API access your subscription includes." },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);

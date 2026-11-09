import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  validateContact, validateConsultation, validateProposal, validateProduct, validateProductRows,
  validateQuantity, validateUpload, looksLikeBot,
} from "../../packages/validation/src/index";
import { parseCsv, toCsv, csvToObjects, formatMoney, slugify, formatDate } from "../../packages/utilities/src/index";
import { allocateFefo, expiryStatus, summariseVariance, isLowStock, inventoryValue } from "../../packages/business-logic/src/stock";
import { can, ROLE_PERMISSIONS } from "../../packages/business-logic/src/permissions";
import { SERVICES, getService, SERVICE_CATEGORIES } from "../../packages/business-logic/src/services";
import { verifyPaystackSignature, mapPaystackEvent } from "../../packages/business-logic/src/paystack";
import { parseAppSheetCount, apiKeyMatches, sha256Hex, NotConfiguredErpConnector } from "../../packages/business-logic/src/integrations";

test("contact validation accepts good input and rejects bad", () => {
  const ok = validateContact({ full_name: "Ada Obi", email: "ada@example.com", message: "Hello there" });
  assert.equal(ok.ok, true);
  const bad = validateContact({ full_name: "A", email: "nope", message: "hi" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["email", "full_name", "message"]);
});

test("consultation rejects past dates and unknown modes", () => {
  const today = new Date("2026-11-04T10:00:00Z");
  const past = validateConsultation({ full_name: "Ada Obi", email: "a@b.co", preferred_date: "2026-11-03" }, today);
  assert.equal(past.ok, false);
  const todayOk = validateConsultation({ full_name: "Ada Obi", email: "a@b.co", preferred_date: "2026-11-04", meeting_mode: "phone" }, today);
  assert.equal(todayOk.ok, true);
  const mode = validateConsultation({ full_name: "Ada Obi", email: "a@b.co", meeting_mode: "teleport" }, today);
  assert.equal(mode.ok, false);
});

test("proposal requires a meaningful scope", () => {
  assert.equal(validateProposal({ full_name: "Ada Obi", email: "a@b.co", scope: "short" }).ok, false);
  assert.equal(validateProposal({ full_name: "Ada Obi", email: "a@b.co", scope: "We need an inventory system for 3 branches" }).ok, true);
});

test("product validation: negatives, expiry implies batches", () => {
  assert.equal(validateProduct({ sku: "A1", name: "X", cost_price: "-1" }).ok, false);
  const r = validateProduct({ sku: "A1", name: "Paracetamol", track_expiry: "yes", cost_price: "1,250.50" });
  assert.equal(r.ok, true);
  if (r.ok) { assert.equal(r.value.track_batches, true); assert.equal(r.value.cost_price, 1250.5); }
});

test("product import reports row numbers and duplicates", () => {
  const rows = csvToObjects("SKU,Name,Cost Price,Barcode\nA1,One,10,1111111\nA1,Dup,10,2222222\n,NoSku,5,3333333\nA3,Three,5,1111111\nA4,Four,x,");
  const rep = validateProductRows(rows);
  assert.equal(rep.valid.length, 1);
  assert.deepEqual(rep.errors.map((e) => e.row), [3, 4, 5, 6]);
  assert.deepEqual(rep.duplicates, ["A1"]);
});

test("quantity validation", () => {
  assert.equal(validateQuantity("12.5").ok, true);
  assert.equal(validateQuantity("-1").ok, false);
  assert.equal(validateQuantity("").ok, false);
  assert.equal(validateQuantity("abc").ok, false);
});

test("upload validation blocks executables, html and oversize", () => {
  assert.equal(validateUpload({ name: "report.pdf", size: 1000, type: "application/pdf" }).ok, true);
  assert.equal(validateUpload({ name: "x.exe", size: 1000, type: "application/pdf" }).ok, false);
  assert.equal(validateUpload({ name: "page.html", size: 10, type: "text/plain" }).ok, false);
  assert.equal(validateUpload({ name: "../etc.pdf", size: 10, type: "application/pdf" }).ok, false);
  assert.equal(validateUpload({ name: "big.pdf", size: 30 * 1024 * 1024, type: "application/pdf" }).ok, false);
  assert.equal(validateUpload({ name: "a.zip", size: 10, type: "application/zip" }).ok, false);
});

test("bot detection: honeypot and instant submit", () => {
  assert.equal(looksLikeBot({ website_url: "http://spam" }), true);
  assert.equal(looksLikeBot({ _t: String(Date.now() - 100) }), true);
  assert.equal(looksLikeBot({ _t: String(Date.now() - 10000) }), false);
  assert.equal(looksLikeBot({}), false);
});

test("csv parse handles quotes, commas, CRLF, BOM; export neutralises formulas", () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n');
  assert.deepEqual(rows, [["a", "b"], ["x, y", 'he said "hi"']]);
  assert.equal(toCsv([["=SUM(A1)", "ok"], ['q"q', "a,b"]]), `'=SUM(A1),ok\r\n"q""q","a,b"`);
});

test("formatters", () => {
  assert.match(formatMoney(1250.5), /1,250\.50/);
  assert.equal(formatMoney(null), "–");
  assert.equal(slugify("  Café & Sons Ltd! "), "cafe-sons-ltd");
  assert.equal(formatDate("not a date"), "–");
});

test("FEFO allocates earliest expiry first and skips expired", () => {
  const batches = [
    { batch_id: "1", batch_no: "B1", expiry_date: "2027-06-01", quantity: 10 },
    { batch_id: "2", batch_no: "B2", expiry_date: "2026-12-01", quantity: 5 },
    { batch_id: "3", batch_no: "B3", expiry_date: "2026-01-01", quantity: 50 },
    { batch_id: "4", batch_no: "B4", expiry_date: null, quantity: 100 },
  ];
  const r = allocateFefo(batches, 12, "2026-11-04");
  assert.deepEqual(r.picks.map((p) => [p.batch_no, p.take]), [["B2", 5], ["B1", 7]]);
  assert.equal(r.shortfall, 0);
  const big = allocateFefo(batches, 200, "2026-11-04");
  assert.equal(big.shortfall, 200 - 115);
});

test("expiry status", () => {
  const today = new Date("2026-11-04T00:00:00Z");
  assert.equal(expiryStatus(null, today), "none");
  assert.equal(expiryStatus("2026-11-03", today), "expired");
  assert.equal(expiryStatus("2026-12-01", today), "near_expiry");
  assert.equal(expiryStatus("2027-12-01", today), "ok");
});

test("variance summary", () => {
  const s = summariseVariance([
    { system_qty: 10, counted_qty: 10, unit_cost: 5 },
    { system_qty: 10, counted_qty: 8, unit_cost: 5 },
    { system_qty: 4, counted_qty: 6, unit_cost: 10 },
  ]);
  assert.deepEqual([s.varianceLines, s.underQty, s.overQty, s.underValue, s.overValue, s.netValue], [2, 2, 2, 10, 20, 10]);
  assert.equal(s.accuracyPct, 33.3);
  assert.equal(summariseVariance([]).accuracyPct, 100);
  assert.equal(isLowStock(5, 5), true);
  assert.equal(inventoryValue([{ quantity: 2, cost_price: 1.5 }, { quantity: 1, cost_price: 10 }]), 13);
});

test("permissions", () => {
  assert.equal(can("manager", "movements.post"), true);
  assert.equal(can("manager", "approvals.decide"), false);
  assert.equal(can("stock_counter", "movements.post"), false);
  assert.equal(can("client", "reports.view"), false);
  assert.equal(can(null, "reports.view"), false);
  assert.ok(ROLE_PERMISSIONS.owner.length >= ROLE_PERMISSIONS.admin.length);
});

test("service catalogue: 13 services, no legacy names, unique slugs", () => {
  assert.equal(SERVICES.length, 13);
  assert.equal(new Set(SERVICES.map((s) => s.slug)).size, 13);
  assert.ok(getService("erp-solutions"));
  assert.ok(SERVICE_CATEGORIES.length >= 4);
  const blob = JSON.stringify(SERVICES);
  assert.doesNotMatch(blob, /odoo/i);
  assert.doesNotMatch(blob, /stockpilot/i);
  for (const s of SERVICES) { assert.ok(s.offerings.length >= 8, s.slug); assert.ok(s.deliverables.length >= 4, s.slug); }
});

test("paystack signature verification and event mapping", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "r1", amount: 500000, currency: "NGN", status: "success", metadata: { organization_id: "o1", plan_key: "starter" } } });
  const sig = createHmac("sha512", "sk_test_x").update(body).digest("hex");
  assert.equal(verifyPaystackSignature(body, sig, "sk_test_x"), true);
  assert.equal(verifyPaystackSignature(body + " ", sig, "sk_test_x"), false);
  assert.equal(verifyPaystackSignature(body, null, "sk_test_x"), false);
  assert.equal(verifyPaystackSignature(body, sig, ""), false);
  const m = mapPaystackEvent(JSON.parse(body));
  assert.equal(m?.billing.amount_kobo, 500000);
  assert.equal(mapPaystackEvent({ event: "transfer.success", data: {} as never }), null);
});

test("appsheet payload parsing and api key check", () => {
  const good = parseAppSheetCount({ event_key: "scan-0001-abc", line_id: "6f1d2f0e-5c3b-4d6a-9f21-0a1b2c3d4e5f", quantity: "12" });
  assert.equal(good.ok, true);
  assert.equal(parseAppSheetCount({ event_key: "x", line_id: "bad", quantity: 1 }).ok, false);
  assert.equal(parseAppSheetCount({ event_key: "scan-0001-abc", line_id: "6f1d2f0e-5c3b-4d6a-9f21-0a1b2c3d4e5f", quantity: -1 }).ok, false);
  assert.equal(parseAppSheetCount(null).ok, false);
  const hash = sha256Hex("secret-key");
  assert.equal(apiKeyMatches("secret-key", hash), true);
  assert.equal(apiKeyMatches("other", hash), false);
  assert.equal(apiKeyMatches(null, hash), false);
});

test("unconfigured ERP connector never pretends to work", async () => {
  const c = new NotConfiguredErpConnector();
  assert.equal((await c.verify()).ok, false);
  await assert.rejects(() => c.pullProducts(), /No ERP system is connected/);
});

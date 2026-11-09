import { SubNav } from "./common";

export const ProcurementNav = () => (
  <SubNav items={[{ href: "/procurement", label: "Purchase orders" }, { href: "/procurement/suppliers", label: "Suppliers" }, { href: "/procurement/receipts", label: "Goods receipts" }]} />
);

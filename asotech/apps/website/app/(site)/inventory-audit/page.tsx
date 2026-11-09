import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("inventory-audit");
export default function Page() {
  return <ServicePage slug="inventory-audit" />;
}

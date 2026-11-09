import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("pos-inventory");
export default function Page() {
  return <ServicePage slug="pos-inventory" />;
}

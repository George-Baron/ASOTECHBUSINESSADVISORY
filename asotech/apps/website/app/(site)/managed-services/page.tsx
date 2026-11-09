import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("managed-services");
export default function Page() {
  return <ServicePage slug="managed-services" />;
}

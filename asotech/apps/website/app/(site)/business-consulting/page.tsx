import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("business-consulting");
export default function Page() {
  return <ServicePage slug="business-consulting" />;
}

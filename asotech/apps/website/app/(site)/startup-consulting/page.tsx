import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("startup-consulting");
export default function Page() {
  return <ServicePage slug="startup-consulting" />;
}

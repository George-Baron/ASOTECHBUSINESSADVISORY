import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("accounting-consulting");
export default function Page() {
  return <ServicePage slug="accounting-consulting" />;
}

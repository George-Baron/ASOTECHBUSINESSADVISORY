import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("software-development");
export default function Page() {
  return <ServicePage slug="software-development" />;
}

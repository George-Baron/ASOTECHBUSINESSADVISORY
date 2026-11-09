import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("website-development");
export default function Page() {
  return <ServicePage slug="website-development" />;
}

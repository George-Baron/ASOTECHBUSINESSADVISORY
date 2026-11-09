import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

export const metadata = serviceMetadata("hr-administration");
export default function Page() {
  return <ServicePage slug="hr-administration" />;
}

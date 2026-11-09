import { ServicePage, serviceMetadata } from "../../../components/ServicePage";

const opts = {
  titleOverride: "Software Product Design",
  introOverride: "From idea to interface: product discovery, requirements, UX and UI design, prototypes and design systems for software your users will actually adopt.",
  offeringFilter: /ideation|requirements|discovery|analysis|architecture|UI\/UX|wireframing|prototyp|journey|design systems|SaaS|enhancement/i,
  routeSlug: "product-design",
};
export const metadata = serviceMetadata("product-design", opts);
export default function Page() {
  return <ServicePage slug="product-design" {...opts} />;
}

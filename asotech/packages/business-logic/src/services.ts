import data from "../data/services.json";
import type { ServiceDefinition } from "@asotech/types";

export const SERVICES: ServiceDefinition[] = (data as ServiceDefinition[]).slice().sort((a, b) => a.sortOrder - b.sortOrder);

export const SERVICE_CATEGORIES = Array.from(new Set(SERVICES.map((s) => s.category)));

export const getService = (slug: string): ServiceDefinition | undefined => SERVICES.find((s) => s.slug === slug);

export const servicesByCategory = (): Record<string, ServiceDefinition[]> =>
  SERVICES.reduce<Record<string, ServiceDefinition[]>>((acc, s) => { (acc[s.category] ||= []).push(s); return acc; }, {});

/** Old/short URLs from the project blueprint that map to a service page. */
export const SERVICE_ALIASES: Record<string, string> = {
  "product-design": "software-development",
  "ict-solutions": "software-development",
};

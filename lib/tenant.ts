import { prisma } from "./prisma";

export type Tenant = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
};

export async function getTenantForHost(host?: string): Promise<Tenant | null> {
  if (!host) return null;
  const hostOnly = host.split(":")[0].toLowerCase();

  // Extract possible subdomain (e.g., chromet.localhost -> chromet)
  const parts = hostOnly.split(".");
  // Treat hostnames like chromet.pizazz.com (3+ parts) as having a subdomain
  // and also treat chromet.localhost (2 parts with 'localhost' TLD) as subdomain during local dev
  const subdomain =
    parts.length > 2
      ? parts[0]
      : parts.length === 2 && parts[1] === "localhost"
      ? parts[0]
      : null;

  // First try direct distributor matches (emailDomain or name contains subdomain)
  const direct =
    (await prisma.distributor.findFirst({
      where: {
        OR: [
          { emailDomain: hostOnly },
          { emailDomain: hostOnly.replace(/^www\./, "") },
          ...(subdomain
            ? [{ name: { contains: subdomain, mode: "insensitive" as const } }]
            : [])
        ]
      },
      select: { id: true, name: true, logoUrl: true, brandColor: true }
    })) || null;

  if (direct) return direct;

  // If no direct match, check configured DistributorDomain records (verified only)
  const domainRecord = await prisma.distributorDomain.findFirst({
    where: { domain: hostOnly, status: "verified" },
    include: {
      distributor: {
        select: { id: true, name: true, logoUrl: true, brandColor: true }
      }
    }
  });

  return domainRecord?.distributor || null;
}

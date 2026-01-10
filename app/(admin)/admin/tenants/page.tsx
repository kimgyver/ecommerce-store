import { prisma } from "@/lib/prisma";
import TenantAdminEditor from "@/components/TenantAdminEditor";

export default async function TenantsPage() {
  const distributors = await prisma.distributor.findMany({
    select: {
      id: true,
      name: true,
      emailDomain: true,
      logoUrl: true,
      brandColor: true
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tenants</h1>
      <div className="grid grid-cols-1 gap-4">
        {distributors.map(d => (
          <TenantAdminEditor key={d.id} distributor={d} />
        ))}
      </div>
    </div>
  );
}

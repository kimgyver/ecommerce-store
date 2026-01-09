import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  try {
    const total = await p.quoteRequest.count();
    console.log("total", total);
    const ordered = await p.quoteRequest.count({
      where: { status: "ordered" }
    });
    console.log("ordered", ordered);
    const start30 = new Date();
    start30.setDate(start30.getDate() - 29);
    console.log("start30", start30.toISOString());
    const total30 = await p.quoteRequest.count({
      where: { createdAt: { gte: start30 } }
    });
    console.log("total30", total30);
    const ordered30 = await p.quoteRequest.count({
      where: { status: "ordered", updatedAt: { gte: start30 } }
    });
    console.log("ordered30", ordered30);
    const rows = await p.quoteRequest.findMany({
      take: 50,
      orderBy: { createdAt: "desc" }
    });
    console.log("recent rows sample:");
    for (const r of rows) {
      console.log(
        r.id,
        r.createdAt.toISOString(),
        r.status,
        r.productId,
        r.quantity,
        r.requesterId,
        r.updatedAt?.toISOString()
      );
    }
  } catch (e) {
    console.error("error", e);
  } finally {
    await p.$disconnect();
  }
})();

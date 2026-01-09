import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import OrderActions from "./components/OrderActions";

type Props = { params: { id: string } };

export default async function OrderDetailPage({ params }: Props) {
  // Ensure params are resolved and valid
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  if (!id) {
    notFound();
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // Not authenticated
    notFound();
  }

  // Only admins may view this page
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (user?.role !== "admin") notFound();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } }
    }
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order {order.id}</h1>
          <p className="text-sm text-gray-500">
            Created: {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Status</p>
          <p className="mt-1 font-semibold text-lg">{order.status}</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            ${order.totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded shadow p-4">
          <h2 className="text-lg font-medium mb-2">Items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="pb-2">Product</th>
                <th className="pb-2">Price Each</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="py-3">{item.product.name}</td>
                  <td className="py-3">${item.price.toFixed(2)}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-medium">Shipping</h3>
          <p className="mt-2 text-sm">{order.recipientName || "-"}</p>
          <p className="text-sm">{order.recipientPhone || "-"}</p>
          <p className="text-sm mt-2">
            {order.shippingAddress1 || ""} {order.shippingAddress2 || ""}
          </p>
          <p className="text-sm">{order.shippingPostalCode || ""}</p>

          <div className="mt-4">
            <h4 className="text-sm font-medium">Customer</h4>
            <p className="text-sm">{order.user?.name || "N/A"}</p>
            <p className="text-sm">{order.user?.email}</p>
          </div>

          <div className="mt-6">
            <OrderActions orderId={order.id} currentStatus={order.status} />
          </div>
        </aside>
      </div>
    </div>
  );
}

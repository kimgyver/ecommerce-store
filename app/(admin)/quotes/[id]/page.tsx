// Deprecated duplicate admin quote detail page.
// The canonical admin quote detail page is under `app/(admin)/admin/quotes/[id]`.

export default function DeprecatedAdminQuoteDetail() {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "Deprecated admin quote detail used — use app/(admin)/admin/quotes/[id] instead."
    );
  }
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Deprecated — Quote Detail (archived)
      </h1>
      <p className="text-sm text-gray-600">
        This page is a duplicate and has been archived. The canonical admin
        quote detail UI is located in <code>app/(admin)/admin/quotes/[id]</code>
        .
      </p>
    </div>
  );
}

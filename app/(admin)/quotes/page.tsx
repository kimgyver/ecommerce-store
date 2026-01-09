// Deprecated duplicate admin quotes page.
// Use the canonical admin quotes pages under `app/(admin)/admin/quotes`.
export default function DeprecatedAdminQuotes() {
  if (typeof window !== "undefined") {
    // Warn in client console to help developers
    // eslint-disable-next-line no-console
    console.warn(
      "Deprecated admin quotes page used — please use app/(admin)/admin/quotes instead."
    );
  }
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Deprecated — Quotes (archived)
      </h1>
      <p className="text-sm text-gray-600">
        This page is a duplicate and has been archived. The canonical admin
        quotes UI is located in <code>app/(admin)/admin/quotes</code>.
      </p>
    </div>
  );
}

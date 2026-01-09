// Shared types for admin quotes
export type QuoteHistoryItem = {
  action: string;
  timestamp: string;
  user?: string;
  note?: string;
};

export type QuoteRequest = {
  id: string;
  status: string;
  createdAt: string;
  product: { sku: string; name: string };
  requester: { email: string; name?: string } | null;
  notes?: string | null;
  quoteFileUrl?: string | null;
  quoteSentAt?: string | null;
  price?: number | string | null;
  quantity?: number | null;
  orderId?: string | null;
  history?: QuoteHistoryItem[] | null;
};

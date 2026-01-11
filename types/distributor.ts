export interface DistributorDomain {
  id: string;
  distributorId: string;
  domain: string;
  status: "pending" | "verified" | "failed" | string;
  lastCheckedAt?: string | Date | null;
  details?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Distributor {
  id: string;
  name: string;
  emailDomain: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  defaultDiscountPercent?: number | null;
}

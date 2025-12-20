import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface ReviewsListProps {
  productId: string;
  onReviewCreated?: () => void;
}

export default function ReviewsList({
  productId,
  onReviewCreated
}: ReviewsListProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReviews();
  }, [productId, onReviewCreated]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?productId=${productId}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");

      const data = await response.json();
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete review");

      setReviews(reviews.filter(r => r.id !== reviewId));
      fetchReviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    }
  };

  const renderStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="border-t pt-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-800">
              {averageRating.toFixed(1)}
            </span>
            <div>
              <div className="text-lg text-yellow-400">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-gray-500">
                {totalReviews} reviews
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No reviews yet.</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-yellow-400 font-semibold">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {review.user.name || review.user.email} •{" "}
                    {new Date(review.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                {session?.user?.id &&
                  (session.user.id === review.user.email ||
                    session.user.email === review.user.email) && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">
                {review.title}
              </h4>
              <p className="text-gray-700">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

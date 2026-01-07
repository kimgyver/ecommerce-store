interface StarRatingProps {
  rating: number | null | undefined;
  reviewCount?: number | null;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  rating,
  reviewCount,
  size = "sm"
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const displayRating = rating ?? 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => {
          const fill =
            star <= Math.floor(displayRating)
              ? "fill-yellow-400"
              : star - 0.5 <= displayRating
              ? "fill-yellow-400"
              : "fill-gray-200";

          return (
            <svg
              key={star}
              className={`${sizeClasses[size]} ${fill} stroke-yellow-500`}
              viewBox="0 0 24 24"
              strokeWidth="1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          );
        })}
      </div>
      <span className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
        {displayRating.toFixed(1)}
      </span>
      {reviewCount !== undefined && reviewCount !== null && (
        <span className={`${textSizeClasses[size]} text-gray-500`}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}

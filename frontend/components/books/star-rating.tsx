type StarRatingDisplayProps = {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRatingDisplay({
  rating,
  maxRating = 5,
  size = "md",
}: StarRatingDisplayProps) {
  const roundedRating = Math.round(rating);

  return (
    <div
      aria-label={`Rated ${Number.isInteger(rating) ? rating : rating.toFixed(1)} out of ${maxRating} stars`}
      className="inline-flex items-center gap-0.5"
      role="img"
    >
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= roundedRating;

        return (
          <svg
            aria-hidden="true"
            className={`${sizeClasses[size]} ${isFilled ? "text-amber-400" : "text-slate-300"}`}
            fill="currentColor"
            key={starValue}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
}


import { getBusinessContext, getReviewReplies } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { ReviewOperations } from "@/components/ReviewOperations";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  let error: string | null = null;
  let reviews: Awaited<ReturnType<typeof getReviewReplies>> = [];
  let context: Awaited<ReturnType<typeof getBusinessContext>> = [];
  try {
    [reviews, context] = await Promise.all([getReviewReplies(), getBusinessContext()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load review automation data.";
  }

  return <div>
    <div className="page-heading review-heading">
      <div>
        <h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>Review Replies</h2>
      </div>
    </div>
    {error ? <SetupNeeded message={error} /> : <ReviewOperations initialReviews={reviews} initialContext={context} />}
  </div>;
}

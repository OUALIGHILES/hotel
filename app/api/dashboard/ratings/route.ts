import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple approach: get reviews for listings owned by this user
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id")
      .eq("user_id", user.id);

    if (listingsError) {
      console.error("Error fetching user listings:", listingsError);
      return Response.json({
        success: true,
        data: {
          reviews: [],
          stats: {
            totalReviews: 0,
            avgRating: 0,
            recentReviews: 0
          }
        }
      });
    }

    let reviews = [];
    if (listings && listings.length > 0) {
      const listingIds = listings.map(l => l.id);

      // Try to get reviews with title column if it exists
      try {
        const { data: reviewsData, error: reviewsDataError } = await supabase
          .from("reviews")
          .select(`
            id,
            rating,
            comment,
            created_at,
            guest_id,
            listing_id
          `)
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviewsDataError) {
          console.error("Error fetching reviews:", reviewsDataError);
        } else {
          reviews = reviewsData;
        }
      } catch (error) {
        console.error("Error in reviews query:", error);
      }
    }

    // Get summary statistics
    let totalReviews = 0;
    let avgRating = 0;
    let recentReviewsCount = 0;

    if (listings && listings.length > 0) {
      const listingIds = listings.map(l => l.id);

      // Count total reviews
      try {
        const { count, error } = await supabase
          .from("reviews")
          .select("*", { count: "exact" })
          .in("listing_id", listingIds);

        if (!error) {
          totalReviews = count || 0;
        }
      } catch (error) {
        console.error("Error counting reviews:", error);
      }

      // Calculate average rating
      try {
        const { data: avgRatingData, error } = await supabase
          .from("reviews")
          .select("AVG(rating)")
          .in("listing_id", listingIds);

        if (!error && avgRatingData && avgRatingData[0] && avgRatingData[0].avg !== null) {
          avgRating = parseFloat(avgRatingData[0].avg) || 0;
        }
      } catch (error) {
        console.error("Error calculating average rating:", error);
      }

      // Count recent reviews (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      try {
        const { count, error } = await supabase
          .from("reviews")
          .select("*", { count: "exact" })
          .in("listing_id", listingIds)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (!error) {
          recentReviewsCount = count || 0;
        }
      } catch (error) {
        console.error("Error counting recent reviews:", error);
      }
    }

    return Response.json({
      success: true,
      data: {
        reviews: reviews || [],
        stats: {
          totalReviews,
          avgRating,
          recentReviews: recentReviewsCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching ratings and reviews:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
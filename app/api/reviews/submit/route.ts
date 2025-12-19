import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listing_id, rating, title, comment, booking_id } = await req.json();

    // Validate input
    if (!listing_id || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: "Invalid input: listing_id and rating (1-5) are required" }, { status: 400 });
    }

    // Get listing to find owner
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("user_id")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return Response.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if user has already reviewed this listing for this booking
    const { data: existingReview, error: existingError } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("guest_id", user.id)
      .single();

    if (existingReview) {
      return Response.json({ error: "Review already exists for this booking" }, { status: 400 });
    }

    // Insert the review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        listing_id,
        guest_id: user.id,
        booking_id,
        rating,
        title,
        comment,
        owner_id: listing.user_id
      })
      .select()
      .single();

    if (reviewError) {
      console.error("Error inserting review:", reviewError);
      return Response.json({ error: "Failed to submit review" }, { status: 500 });
    }

    // Create notification for the owner
    await supabase
      .from("notifications")
      .insert({
        user_id: listing.user_id,
        title: "New Review Received",
        message: `Your property received a new ${rating}-star review from a guest.`,
        type: "review",
        action_url: `/dashboard/properties`,
        is_read: false
      });

    return Response.json({ success: true, review });
  } catch (error) {
    console.error("Error submitting review:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
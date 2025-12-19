"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Calendar, User, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  guest_id: string;
  listings: {
    name: string;
    property_name?: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface RatingsData {
  reviews: Review[];
  stats: {
    totalReviews: number;
    avgRating: number;
    recentReviews: number;
  };
}

export default function RatingsAndReviewsDashboard() {
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRatingsData = async () => {
      try {
        const response = await fetch("/api/dashboard/ratings");
        if (!response.ok) {
          throw new Error("Failed to fetch ratings data");
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch ratings data");
        }
      } catch (err) {
        console.error("Error fetching ratings data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRatingsData();
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-100 rounded-lg">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-gray-100 rounded-lg">
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  // Render star ratings
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Reviews</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{data.stats.totalReviews}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500 text-white">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">
                {data.stats.recentReviews} this month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Avg. Rating</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {data.stats.avgRating.toFixed(1)} <span className="text-sm">/ 5</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500 text-white">
                <Star className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              {renderStars(Math.round(data.stats.avgRating))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Review Ratio</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {data.stats.totalReviews > 0
                    ? ((data.stats.totalReviews / data.stats.totalReviews) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500 text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-sm text-purple-600">
              Engagement Rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reviews */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Recent Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reviews yet
              </div>
            ) : (
              <div className="space-y-4">
                {data.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={`https://ui-avatars.com/api/?name=${review.profiles.first_name}+${review.profiles.last_name}&background=0D8ABC&color=fff`}
                          alt={`${review.profiles.first_name} ${review.profiles.last_name}`}
                        />
                        <AvatarFallback>
                          {review.profiles.first_name.charAt(0)}
                          {review.profiles.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">
                              {review.profiles.first_name} {review.profiles.last_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {review.listings.name || review.listings.property_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                            <span className="ml-1 text-sm font-medium">{review.rating}</span>
                          </div>
                        </div>

                        {review.title && (
                          <h5 className="mt-2 font-medium text-gray-800">{review.title}</h5>
                        )}

                        {review.comment && (
                          <p className="mt-2 text-gray-700">{review.comment}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
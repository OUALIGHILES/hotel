"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Activity, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

interface Channel {
  id: string
  name: string
  type: string
  commission_rate: number
  is_active: boolean
  property_id: string
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        console.error("User not authenticated via API check");
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        console.error("No user found in auth check");
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        console.error("User ID not found in API response");
        setIsAuthenticated(false);
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, return empty channels
        setChannels([]);
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get channels for the user's properties
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .in("property_id", propertyIds) // Filter by user's property IDs
        .order("name", { ascending: true })

      if (error) throw error
      setChannels(data || [])
    } catch (error) {
      console.error("Error fetching channels:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your booking channels.
        </p>
        <Button
          onClick={() => router.push("/auth/login")}
          className="bg-amber-500 hover:bg-amber-600"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Booking Channels</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Connect Channel
        </Button>
      </div>

      {isLoading ? (
        <p>Loading channels...</p>
      ) : channels.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No channels connected yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{channel.name}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">{channel.type}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className={`w-4 h-4 ${channel.is_active ? "text-green-500" : "text-gray-400"}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-semibold">Commission: {channel.commission_rate}%</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1">
                    <Trash2 className="w-3 h-3" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

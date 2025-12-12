"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Activity, Lock, Globe, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getAirbnbConnectionStatus } from "@/lib/airbnb/utils"
import AirbnbConnectionCard from "@/components/airbnb/airbnb-connection-card"
import AirbnbUnitSync from "@/components/airbnb/airbnb-unit-sync"
import AirbnbApiService from "@/lib/airbnb/airbnb-api";
import { AirbnbListing, AirbnbReservation } from "@/lib/airbnb/airbnb-api";

interface Channel {
  id: string
  name: string
  type: string
  commission_rate: number
  is_active: boolean
  property_id: string
  external_account_id?: string | null
  last_sync_at?: string | null
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
}

interface Unit {
  id: string;
  property_id: string;
  name: string;
  floor: number | null;
  price_per_night: number;
  status: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const [airbnbConnected, setAirbnbConnected] = useState(false);
  const [airbnbListings, setAirbnbListings] = useState<AirbnbListing[]>([]);
  const [pmsUnits, setPmsUnits] = useState<Unit[]>([]);
  const [pmsProperties, setPmsProperties] = useState<Property[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData();

    // Check for success/error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'airbnb_connected') {
      alert('Airbnb account connected successfully!');
    } else if (error) {
      alert(`Error: ${error.replace('_', ' ')}`);
    }
  }, [])

  const fetchData = async () => {
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

      const currentUserId = result.user.id;
      if (!currentUserId) {
        console.error("User ID not found in API response");
        setIsAuthenticated(false);
        return;
      }

      setUserId(currentUserId);

      // Check Airbnb connection status
      const airbnbStatus = await getAirbnbConnectionStatus(currentUserId);
      setAirbnbConnected(!!airbnbStatus.isConnected);

      // Get the user's properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", currentUserId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      setPmsProperties(propertiesData || []);

      // Get all units for these properties
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map(prop => prop.id);

        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("*")
          .in("property_id", propertyIds);

        if (unitsError) {
          console.error("Error fetching units:", unitsError);
        } else {
          setPmsUnits(unitsData || []);
        }
      }

      // Get channels for the user's properties
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map(prop => prop.id);

        const { data, error } = await supabase
          .from("channels")
          .select("*")
          .in("property_id", propertyIds) // Filter by user's property IDs
          .order("name", { ascending: true });

        if (error) throw error;
        setChannels(data || []);
      } else {
        setChannels([]);
      }

      // Get Airbnb listings if connected
      if (airbnbStatus.isConnected) {
        await fetchAirbnbListings(currentUserId);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchAirbnbListings = async (currentUserId: string) => {
    try {
      const airbnbService = new AirbnbApiService();
      const listings = await airbnbService.getListings(currentUserId);
      setAirbnbListings(listings);
    } catch (error) {
      console.error("Error fetching Airbnb listings:", error);
      // Set empty array on error but allow user to see the UI
      setAirbnbListings([]);
    }
  };

  const handleConnectAirbnb = () => {
    window.location.href = '/api/airbnb/auth';
  };

  const handleDisconnectAirbnb = async () => {
    try {
      const response = await fetch('/api/airbnb/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setAirbnbConnected(false);
        setAirbnbListings([]);
        alert('Airbnb account disconnected successfully');
      } else {
        alert('Failed to disconnect Airbnb account');
      }
    } catch (error) {
      console.error('Error disconnecting Airbnb:', error);
    }
  };

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Booking Channels</h1>
          <p className="text-muted-foreground mt-1">Manage your distribution channels and sync listings</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Link href="/dashboard/units">
              <Home className="w-4 h-4" />
              Manage Units
            </Link>
          </Button>
        </div>
      </div>

      {/* Airbnb Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AirbnbConnectionCard
            userId={userId || ''}
            onConnect={handleConnectAirbnb}
            onDisconnect={handleDisconnectAirbnb}
            isConnected={airbnbConnected}
            onStatusChange={setAirbnbConnected}
          />
        </div>

        <div className="lg:col-span-2">
          {airbnbConnected ? (
            <AirbnbUnitSync
              pmsUnits={pmsUnits}
              pmsProperties={pmsProperties}
              airbnbListings={airbnbListings}
              userId={userId || ''}
            />
          ) : (
            <Card className="h-full flex items-center justify-center p-12">
              <div className="text-center">
                <Globe className="w-12 h-12 mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">Connect Airbnb to Get Started</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your Airbnb account to view and sync your listings with your PMS.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Other Channels Section */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Other Booking Channels
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect other distribution channels to expand your reach.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <p>Loading channels...</p>
          ) : channels.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">No other channels connected yet</p>
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
        </CardContent>
      </Card>
    </div>
  )
}

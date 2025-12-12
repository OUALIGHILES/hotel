import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Activity, Lock, Globe, Home, Wifi, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ChannexConnectionCard from "@/components/channex/channex-connection-card";
import ChannexChannelsList from "@/components/channex/channex-channels-list";

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

interface ChannexConnection {
  id: string;
  user_id: string;
  channex_user_api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sync_at?: string | null;
  token_expires_at?: string | null;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const [channexConnected, setChannexConnected] = useState(false);
  const [pmsUnits, setPmsUnits] = useState<Unit[]>([]);
  const [pmsProperties, setPmsProperties] = useState<Property[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient()
  const router = useRouter()

  // Mock data for testing
  const mockProperties: Property[] = [
    { id: 'prop1', name: 'Beachfront Resort', address: '123 Ocean Drive', city: 'Miami', country: 'USA' },
    { id: 'prop2', name: 'Mountain Cabin', address: '456 Pine Street', city: 'Asheville', country: 'USA' }
  ];

  const mockUnits: Unit[] = [
    { id: 'unit1', property_id: 'prop1', name: 'Ocean View Suite', floor: 5, price_per_night: 250, status: 'available' },
    { id: 'unit2', property_id: 'prop1', name: 'Deluxe King Room', floor: 3, price_per_night: 180, status: 'available' },
    { id: 'unit3', property_id: 'prop2', name: 'Luxury Cabin', floor: null, price_per_night: 320, status: 'available' }
  ];

  useEffect(() => {
    fetchData();
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

      // Mock channex connection status - in real implementation, this would check the database
      // For testing, we'll simulate that the user is connected
      // setChannexConnected(true); // Uncomment this to simulate a connected state
      
      // Set mock data
      setPmsProperties(mockProperties);
      setPmsUnits(mockUnits);

      // Mock channels data
      const mockChannels: Channel[] = [
        { id: 'ch1', name: 'Booking.com', type: 'ota', commission_rate: 15, is_active: true, property_id: 'prop1' },
        { id: 'ch2', name: 'Airbnb', type: 'ota', commission_rate: 3, is_active: true, property_id: 'prop1' },
        { id: 'ch3', name: 'Expedia', type: 'ota', commission_rate: 12, is_active: true, property_id: 'prop2' },
      ];
      setChannels(mockChannels);

    } catch (error) {
      console.error("Error fetching channels:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  // Test connection function that simulates API key validation
  const handleTestConnection = () => {
    // Simulate API call to validate API key with Channex
    // In real implementation, this would call your API route
    console.log("Testing connection with Channex API...");
    
    // Simulate a successful connection
    setTimeout(() => {
      setChannexConnected(true);
      alert('Successfully connected to Channex! Your OTA channels are now available.');
    }, 1000);
  };

  // Test disconnection function
  const handleTestDisconnection = () => {
    // Simulate API call to disconnect from Channex
    console.log("Disconnecting from Channex...");
    
    // Simulate a successful disconnection
    setTimeout(() => {
      setChannexConnected(false);
      alert('Successfully disconnected from Channex.');
    }, 500);
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
          <p className="text-muted-foreground mt-1">Manage your distribution channels through Channex</p>
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

      {/* Channex Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className={`border-2 ${channexConnected ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Channex Connection
                      {channexConnected && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Connect to Channex for OTA management
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!channexConnected ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Enter your Channex API key to connect your OTA channels.
                    </p>
                    <p className="text-xs p-3 bg-blue-50 rounded text-blue-700">
                      <strong>Test Mode:</strong> For testing purposes, use any text as API key. In production, you would use a real Channex API key.
                    </p>
                    <input
                      type="password"
                      placeholder="Enter API key"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-700" />
                    <span className="text-sm text-green-700">Successfully connected to Channex</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Connected to Channex</p>
                    <p className="text-xs text-muted-foreground">
                      All OTA channels connected to your Channex account are now managed through this PMS.
                    </p>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Booking.com</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Airbnb</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Expedia</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {!channexConnected ? (
                <Button 
                  onClick={handleTestConnection} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Connect to Channex
                </Button>
              ) : (
                <Button 
                  onClick={handleTestDisconnection} 
                  variant="destructive"
                  className="w-full"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Disconnect from Channex
                </Button>
              )}
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="https://www.channex.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Learn more about Channex
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Wifi className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Connect Channex to Manage All Your OTAs</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Channex account to manage all your OTA channels (Booking.com, Airbnb, Expedia, etc.) from one place.
            </p>
            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Sync availability across all connected channels</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Manage rates and restrictions centrally</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Receive reservations from all platforms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channex Connected Content */}
      {channexConnected && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-blue-500" />
                  Connected OTA Channels
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage all OTA channels connected through Channex.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChannexChannelsList userId={userId || ''} />
          </CardContent>
        </Card>
      )}

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
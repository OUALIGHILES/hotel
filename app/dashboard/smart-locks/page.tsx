"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Battery,
  Lock,
  Unlock,
  Settings,
  RefreshCw,
  Wifi,
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react"

interface SmartLock {
  id: string
  unit_id: string
  name: string
  device_id: string
  status: string
  battery_level: number | null
  last_activity: string
}

interface Unit {
  id: string
  name: string
}

interface TuyaCredentials {
  connected: boolean
  hasCredentials: boolean
  region: string
}

export default function SmartLocksPage() {
  const [locks, setLocks] = useState<SmartLock[]>([])
  const [units, setUnits] = useState<Record<string, Unit>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [tuyaConnected, setTuyaConnected] = useState(false)
  const [tuyaCredentials, setTuyaCredentials] = useState<TuyaCredentials>({
    connected: false,
    hasCredentials: false,
    region: 'us'
  })
  const [tuyaForm, setTuyaForm] = useState({
    clientId: '',
    clientSecret: '',
    region: 'us'
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = createClient()

  // Function to get the authenticated user from both Supabase and custom auth
  const getAuthenticatedUser = async () => {
    try {
      // Try to get the session from Supabase first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return session.user;
      }

      // If no session, try getting user directly from Supabase
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      if (supabaseUser && !error) {
        return supabaseUser;
      }

      // If Supabase auth fails, try the custom auth system
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          const { user: customUser } = await response.json();
          if (customUser) {
            // Return the user data from custom auth in the same format as Supabase
            return {
              id: customUser.id,
              email: customUser.email,
              user_metadata: {
                full_name: customUser.full_name
              }
            };
          }
        }
      } catch (customAuthError) {
        console.warn('Custom auth check failed:', customAuthError);
      }
    } catch (error: any) {
      if (error?.message?.includes('Auth session missing')) {
        // Check custom auth as fallback
        try {
          const response = await fetch('/api/auth/check');
          if (response.ok) {
            const { user: customUser } = await response.json();
            if (customUser) {
              return {
                id: customUser.id,
                email: customUser.email,
                user_metadata: {
                  full_name: customUser.full_name
                }
              };
            }
          }
        } catch (customAuthError) {
          console.warn('Custom auth check failed:', customAuthError);
        }
        return null;
      }
      console.error('Error getting authenticated user:', error);
    }

    return null;
  };

  // Function to check and refresh authentication
  const checkAndRefreshAuth = async (retryCount = 0) => {
    try {
      const user = await getAuthenticatedUser();

      if (user) {
        setIsAuthenticated(true);
        fetchLocksAndTuyaStatus();
        return true;
      }

      // If we're on the first attempt and there's no user, try to refresh
      if (retryCount === 0) {
        // This might help if there are stored cookies that can restore the session
        try {
          const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.refreshSession();

          if (restoredSession?.user) {
            setIsAuthenticated(true);
            fetchLocksAndTuyaStatus();
            return true;
          }
        } catch (refreshError) {
          // If refresh fails, try custom auth as fallback
          console.warn("Session refresh failed:", refreshError);
          try {
            const response = await fetch('/api/auth/check');
            if (response.ok) {
              const { user: customUser } = await response.json();
              if (customUser) {
                setIsAuthenticated(true);
                fetchLocksAndTuyaStatus();
                return true;
              }
            }
          } catch (customAuthError) {
            console.warn('Custom auth check after refresh failed:', customAuthError);
          }
        }
      }

      setIsAuthenticated(false);
      if (process.env.NODE_ENV === 'development') {
        console.warn("Authentication check failed");
      }
      return false;
    } catch (error: any) {
      // Handle specific AuthSessionMissingError
      if (error?.message?.includes('Auth session missing')) {
        // Try custom auth as fallback
        try {
          const response = await fetch('/api/auth/check');
          if (response.ok) {
            const { user: customUser } = await response.json();
            if (customUser) {
              setIsAuthenticated(true);
              fetchLocksAndTuyaStatus();
              return true;
            }
          }
        } catch (customAuthError) {
          console.warn('Custom auth check in catch block failed:', customAuthError);
        }

        setIsAuthenticated(false);
        if (process.env.NODE_ENV === 'development') {
          console.warn("No authentication session found");
        }
        return false;
      }

      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    // Initial authentication check
    checkAndRefreshAuth();
  }, []);

  const fetchLocksAndTuyaStatus = async () => {
    try {
      setIsLoading(true)

      // Check authentication using our helper function
      const user = await getAuthenticatedUser();

      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("User not authenticated in fetchLocksAndTuyaStatus");
        }
        setIsAuthenticated(false);
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, tuya_connected")
        .eq("user_id", user.id);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, return empty locks
        setLocks([]);
        return;
      }

      // Update Tuya connection status
      const isConnected = propertiesData.some(prop => prop.tuya_connected);
      setTuyaConnected(isConnected);

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get units for the user's properties
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("*")
        .in("property_id", propertyIds);

      if (unitsError) {
        console.error("Error fetching units:", unitsError);
        return;
      }

      // Create a lookup object for units
      const unitsLookup: Record<string, Unit> = {};
      if (unitsData) {
        unitsData.forEach(unit => {
          unitsLookup[unit.id] = unit;
        });
        setUnits(unitsLookup);
      }

      // Get smart locks for the user's units
      const { data, error } = await supabase
        .from("smart_locks")
        .select("*")
        .in("unit_id", unitsData?.map(unit => unit.id) || []) // Filter by user's unit IDs
        .order("name", { ascending: true })

      if (error) throw error
      setLocks(data || [])
    } catch (error) {
      console.error("Error fetching smart locks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTuyaConnect = async () => {
    if (!tuyaForm.clientId || !tuyaForm.clientSecret) {
      setConnectionError('Client ID and Client Secret are required');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');

    try {
      // Find the user's property to associate with Tuya credentials
      const user = await getAuthenticatedUser();

      if (!user) {
        setConnectionError('User not authenticated');
        setIsAuthenticated(false);
        return;
      }

      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (propertiesError || !propertiesData || propertiesData.length === 0) {
        setConnectionError('No properties found for user');
        return;
      }

      const propertyId = propertiesData[0].id;

      // Call API to set Tuya credentials
      const response = await fetch('/api/smart-locks/tuya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          action: 'set-credentials',
          credentials: {
            clientId: tuyaForm.clientId,
            clientSecret: tuyaForm.clientSecret,
            region: tuyaForm.region
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setTuyaCredentials({
          connected: true,
          hasCredentials: true,
          region: tuyaForm.region
        });
        setTuyaConnected(true);
        setConnectionError('');
      } else {
        setConnectionError(result.error || 'Failed to connect to Tuya');
      }
    } catch (error: any) {
      setConnectionError(error.message || 'An error occurred while connecting to Tuya');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTuyaDisconnect = async () => {
    try {
      // Find the user's property
      const user = await getAuthenticatedUser();

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!propertiesData || propertiesData.length === 0) return;

      const propertyId = propertiesData[0].id;

      // Call API to disconnect
      const response = await fetch('/api/smart-locks/tuya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          action: 'disconnect'
        })
      });

      const result = await response.json();

      if (result.success) {
        setTuyaCredentials({
          connected: false,
          hasCredentials: false,
          region: 'us'
        });
        setTuyaConnected(false);
        setTuyaForm({ clientId: '', clientSecret: '', region: 'us' });
      }
    } catch (error) {
      console.error('Error disconnecting from Tuya:', error);
    }
  };

  const syncTuyaDevices = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage('');

      // Find the user's property
      const user = await getAuthenticatedUser();

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!propertiesData || propertiesData.length === 0) return;

      const propertyId = propertiesData[0].id;

      // Call API to sync devices
      const response = await fetch('/api/smart-locks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      });

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message);
        // Refresh locks after sync
        fetchLocksAndTuyaStatus();
      } else {
        setSyncMessage(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setSyncMessage(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const controlLock = async (deviceId: string, action: 'lock' | 'unlock' | 'refresh-status') => {
    try {
      // Find the user's property
      const user = await getAuthenticatedUser();

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!propertiesData || propertiesData.length === 0) return;

      const propertyId = propertiesData[0].id;

      // Call API to control the device
      const response = await fetch('/api/smart-locks/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, action, propertyId })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh locks after control action
        fetchLocksAndTuyaStatus();

        if (action === 'refresh-status') {
          console.log('Status refreshed successfully');
        }
      } else {
        console.error(`Error ${action}ing lock:`, result.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing lock:`, error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-muted-foreground mb-4">Please log in to access smart lock controls</p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              // Redirect to login page
              window.location.href = '/auth/login';
            }}
          >
            Go to Login
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              // Try to refresh session using our comprehensive function
              const authResult = await checkAndRefreshAuth(1); // retryCount = 1 to skip initial retry logic
              if (!authResult) {
                // If still not authenticated, redirect to login
                window.location.href = '/auth/login';
              }
            }}
          >
            Refresh Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Smart Locks</h1>
          <p className="text-muted-foreground mt-1">Manage and control your smart locks</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Tuya Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Connect to Tuya Platform</DialogTitle>
                <DialogDescription>
                  Connect your Tuya account to control smart locks remotely
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="connect" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="connect">Connect</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>

                <TabsContent value="connect" className="space-y-4">
                  {!tuyaConnected ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Tuya Client ID</Label>
                        <Input
                          id="clientId"
                          value={tuyaForm.clientId}
                          onChange={(e) => setTuyaForm({...tuyaForm, clientId: e.target.value})}
                          placeholder="Enter your Tuya Client ID"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientSecret">Tuya Client Secret</Label>
                        <Input
                          id="clientSecret"
                          type="password"
                          value={tuyaForm.clientSecret}
                          onChange={(e) => setTuyaForm({...tuyaForm, clientSecret: e.target.value})}
                          placeholder="Enter your Tuya Client Secret"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Select
                          value={tuyaForm.region}
                          onValueChange={(value) => setTuyaForm({...tuyaForm, region: value as any})}
                        >
                          <SelectTrigger id="region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">USA</SelectItem>
                            <SelectItem value="eu">Europe</SelectItem>
                            <SelectItem value="cn">China</SelectItem>
                            <SelectItem value="in">India</SelectItem>
                            <SelectItem value="sg">Singapore</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {connectionError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{connectionError}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleTuyaConnect}
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect to Tuya'
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="rounded-full bg-green-500 p-1">
                          <Wifi className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Connected to Tuya</p>
                          <p className="text-sm text-muted-foreground">Your smart locks are linked to Tuya platform</p>
                        </div>
                      </div>

                      <Button
                        onClick={handleTuyaDisconnect}
                        variant="outline"
                        className="w-full"
                      >
                        Disconnect from Tuya
                      </Button>
                    </div>
                  )}

                  {syncMessage && (
                    <Alert>
                      <AlertDescription>{syncMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={syncTuyaDevices}
                    disabled={isSyncing || !tuyaConnected}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sync Devices
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="info" className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p>
                      To connect your smart locks to the Tuya platform:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Create an account on <a
                        href="https://platform.tuya.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        Tuya Developer Platform
                      </a></li>
                      <li>Create a new cloud project</li>
                      <li>Get your Client ID and Client Secret from the project settings</li>
                      <li>Enter your credentials here to connect</li>
                    </ol>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium mb-1">Note:</p>
                      <p className="text-sm">
                        Your credentials are stored securely and only used to connect to the Tuya API.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Lock
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : locks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No smart locks connected yet</p>
          {tuyaConnected && (
            <Button
              onClick={syncTuyaDevices}
              disabled={isSyncing}
              className="mt-4"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing devices...
                </>
              ) : (
                'Sync Tuya Devices'
              )}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locks.map((lock) => (
            <Card key={lock.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{lock.name || `Lock ${lock.device_id.substring(0, 8)}`}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Unit: {units[lock.unit_id]?.name || 'Unknown Unit'}
                    </p>
                    {lock.last_activity && (
                      <p className="text-xs text-muted-foreground">
                        Last activity: {new Date(lock.last_activity).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {lock.status === "locked" ? (
                    <div className="flex flex-col items-end">
                      <Lock className="w-5 h-5 text-green-500" />
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-1">Locked</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <Unlock className="w-5 h-5 text-orange-500" />
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full mt-1">Unlocked</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lock.battery_level !== null && (
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${
                          lock.battery_level > 50
                            ? "bg-green-500"
                            : lock.battery_level > 20
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${lock.battery_level}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">{lock.battery_level}%</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => controlLock(lock.device_id, 'unlock')}
                    disabled={!tuyaConnected}
                  >
                    <Unlock className="w-3 h-3" />
                    Unlock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => controlLock(lock.device_id, 'lock')}
                    disabled={!tuyaConnected}
                  >
                    <Lock className="w-3 h-3" />
                    Lock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => controlLock(lock.device_id, 'refresh-status')}
                  >
                    <RefreshCw className="w-3 h-3" />
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

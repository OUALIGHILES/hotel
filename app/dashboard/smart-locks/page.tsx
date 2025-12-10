"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Battery, Lock, Unlock } from "lucide-react"

interface SmartLock {
  id: string
  unit_id: string
  name: string
  device_id: string
  status: string
  battery_level: number
  last_activity: string
}

interface Unit {
  id: string
  name: string
}

export default function SmartLocksPage() {
  const [locks, setLocks] = useState<SmartLock[]>([])
  const [units, setUnits] = useState<Record<string, Unit>>({})
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLocks()
  }, [])

  const fetchLocks = async () => {
    try {
      // First get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
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
      const unitsLookup = {};
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Smart Locks</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Lock
        </Button>
      </div>

      {isLoading ? (
        <p>Loading smart locks...</p>
      ) : locks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No smart locks connected yet</p>
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
                    <Lock className="w-5 h-5 text-green-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-orange-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${lock.battery_level > 50 ? "bg-green-500" : lock.battery_level > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${lock.battery_level}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{lock.battery_level}%</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Unlock className="w-3 h-3" />
                    Unlock
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Lock className="w-3 h-3" />
                    Lock
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

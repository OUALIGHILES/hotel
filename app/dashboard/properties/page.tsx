"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, MapPin, Clock, Lock } from "lucide-react"
import { useLanguage } from "@/lib/language-context";
import { useRouter } from "next/navigation";

interface Property {
  id: string
  name: string
  address: string
  city: string
  country: string
  check_in_time: string
  check_out_time: string
  currency: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const { t } = useLanguage(); // Get the translation function
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchProperties()
  }, [])

  const checkAuthenticationAndFetchProperties = async () => {
    try {
      // Check if user is authenticated using the same method as the header
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

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", userId)

      if (error) {
        console.error("Error fetching properties:", error);
        // Only show the error to the user if it's not a foreign key issue
        if (error.message.includes("foreign key") || error.message.includes("violates")) {
          console.error("Database auth mismatch: user ID not found in auth.users table");
          setProperties([]);
          return;
        }
        throw error;
      }
      setProperties(data || [])
    } catch (error) {
      console.error("Error fetching properties:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  const addProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const address = formData.get('address') as string;
      const city = formData.get('city') as string;
      const country = formData.get('country') as string;
      const checkInTime = formData.get('check_in_time') as string;
      const checkOutTime = formData.get('check_out_time') as string;

      // Validate inputs
      if (!name || !address || !city || !country || !checkInTime || !checkOutTime) {
        alert('Please fill in all required fields');
        return;
      }

      // First get the authenticated user using the same method as the header
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        console.error("User not authenticated via API check");
        setIsAuthenticated(false);
        router.push("/auth/login"); // Redirect to login
        return;
      }

      const result = await response.json();
      if (!result.user) {
        console.error("No user found in auth check");
        setIsAuthenticated(false);
        router.push("/auth/login"); // Redirect to login
        return;
      }

      const userId = result.user.id;

      // Insert the new property into the database
      const { error } = await supabase
        .from("properties")
        .insert([{
          name,
          address,
          city,
          country,
          user_id: userId, // Use user ID from API response
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          currency: "USD" // Default currency
        }]);

      if (error) {
        console.error("Error adding property:", error);
        alert("Error adding property: " + error.message);
        return;
      }

      // Refresh the properties list
      await checkAuthenticationAndFetchProperties();
      setShowForm(false);
    } catch (error) {
      console.error("Error adding property:", error);
      alert("Error adding property: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to delete this property? This will also delete all units and related data.")) {
      return;
    }

    setIsLoading(true);
    try {
      // First get the authenticated user using the same method as the header
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        console.error("User not authenticated via API check");
        setIsAuthenticated(false);
        router.push("/auth/login"); // Redirect to login
        return;
      }

      const result = await response.json();
      if (!result.user) {
        console.error("No user found in auth check");
        setIsAuthenticated(false);
        router.push("/auth/login"); // Redirect to login
        return;
      }

      const userId = result.user.id;

      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId)
        .eq("user_id", userId); // Ensure user can only delete their own properties

      if (error) {
        console.error("Error deleting property:", error);
        alert("Error deleting property: " + error.message);
        return;
      }

      // Refresh the properties list
      await checkAuthenticationAndFetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Error deleting property: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your properties.
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
        <h1 className="text-3xl font-bold">Properties</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Property"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={addProperty} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Property Name</label>
                  <input name="name" type="text" placeholder="Property Name" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input name="address" type="text" placeholder="Address" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('city')}</label>
                  <select name="city" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" required>
                    <option value="">{t('selectCityPlaceholder')}</option>
                    <option value="Riyadh">{t('riyadh')}</option>
                    <option value="Jeddah">{t('jeddah')}</option>
                    <option value="Dammam">{t('dammam')}</option>
                    <option value="Abha">{t('abha')}</option>
                    <option value="Al Khobar">{t('alKhobar')}</option>
                    <option value="Madinah">{t('madinah')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input name="country" type="text" placeholder="Country" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-in Time</label>
                  <input name="check_in_time" type="time" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" defaultValue="14:00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-out Time</label>
                  <input name="check_out_time" type="time" className="w-full px-3 py-2 border rounded-lg bg-background text-foreground" defaultValue="11:00" required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save Property</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Loading properties...</p>
      ) : properties.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No properties yet. Create your first property to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{property.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{property.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.city}, {property.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {property.check_in_time} / {property.check_out_time}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => deleteProperty(property.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
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

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, MapPin, Clock } from "lucide-react"
import { useLanguage } from "@/lib/language-context";

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
  const { t } = useLanguage(); // Get the translation function
  const supabase = createClient()

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      // Get the authenticated user from the API
      const userResponse = await fetch("/api/auth/check");
      if (!userResponse.ok) {
        console.error("User not authenticated");
        setProperties([]);
        return;
      }

      const userData = await userResponse.json();
      if (!userData.user) {
        console.error("User not authenticated");
        setProperties([]);
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", userData.user.id)

      if (error) {
        // If it's a foreign key constraint error, the user IDs don't match the auth.users table
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

      // Validate inputs
      if (!name || !address || !city || !country) {
        alert('Please fill in all required fields');
        return;
      }

      // First get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("User not authenticated");
        return;
      }

      // Insert the new property into the database
      const { error } = await supabase
        .from("properties")
        .insert([{
          name,
          address,
          city,
          country,
          user_id: user.id, // Use Supabase user ID
          check_in_time: "14:00:00", // Default check-in time
          check_out_time: "11:00:00", // Default check-out time
          currency: "USD" // Default currency
        }]);

      if (error) {
        console.error("Error adding property:", error);
        alert("Error adding property: " + error.message);
        return;
      }

      // Refresh the properties list
      await fetchProperties();
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
      // Get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("User not authenticated");
        return;
      }

      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId)
        .eq("user_id", user.id); // Ensure user can only delete their own properties

      if (error) {
        console.error("Error deleting property:", error);
        alert("Error deleting property: " + error.message);
        return;
      }

      // Refresh the properties list
      await fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Error deleting property: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

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
        <Card className="bg-slate-50">
          <CardContent className="pt-6">
            <form onSubmit={addProperty} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Property Name</label>
                  <input name="name" type="text" placeholder="Property Name" className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input name="address" type="text" placeholder="Address" className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('city')}</label>
                  <select name="city" className="w-full px-3 py-2 border rounded-lg" required>
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
                  <input name="country" type="text" placeholder="Country" className="w-full px-3 py-2 border rounded-lg" required />
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

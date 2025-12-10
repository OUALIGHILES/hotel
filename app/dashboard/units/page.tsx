"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"

interface Unit {
  id: string
  name: string
  floor: number
  price_per_night: number
  status: string
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchPropertiesAndUnits();
  }, []);

  const fetchPropertiesAndUnits = async () => {
    try {
      // First get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("User not authenticated");
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", user.id);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      setProperties(propertiesData || []);

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, return empty units
        setUnits([]);
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get units for the user's properties
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .in("property_id", propertyIds); // Filter by user's property IDs

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error("Error fetching units:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      // First get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
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
        // If the user has no properties, return empty units
        setUnits([]);
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get units for the user's properties
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .in("property_id", propertyIds); // Filter by user's property IDs

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error("Error fetching units:", error)
    }
  }

  const statusColors = {
    vacant: "bg-green-100 text-green-800",
    occupied: "bg-blue-100 text-blue-800",
    reserved: "bg-yellow-100 text-yellow-800",
    maintenance: "bg-red-100 text-red-800",
  }

  const addUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const floor = parseInt(formData.get('floor') as string) || 0;
      const price = parseFloat(formData.get('price') as string) || 0;
      const propertyId = formData.get('propertyId') as string;

      // First get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("User not authenticated");
        return;
      }

      // Validate inputs
      if (!name || !propertyId) {
        alert('Please fill in all required fields');
        return;
      }

      // Verify the property belongs to the user
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("user_id", user.id)
        .single();

      if (propertyError || !propertyData) {
        alert("Invalid property or property does not belong to you");
        return;
      }

      // Insert the new unit into the database
      const { error } = await supabase
        .from("units")
        .insert([{
          name,
          floor,
          price_per_night: price,
          status: "vacant", // Default status
          property_id: propertyId
        }]);

      if (error) {
        console.error("Error adding unit:", error);
        alert("Error adding unit: " + error.message);
        return;
      }

      // Refresh the units list
      await fetchUnits();
      setShowForm(false);
    } catch (error) {
      console.error("Error adding unit:", error);
      alert("Error adding unit: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUnit = async (unitId: string) => {
    if (!window.confirm("Are you sure you want to delete this unit? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      // First get the authenticated user using Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("User not authenticated");
        return;
      }

      // Actually, let's first get the unit to make sure it belongs to user's properties
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("property_id")
        .eq("id", unitId)
        .single();

      if (unitError || !unitData) {
        alert("Unit not found or error occurred");
        return;
      }

      // Now check if the property belongs to the user
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", unitData.property_id)
        .eq("user_id", user.id)
        .single();

      if (propertyError || !propertyData) {
        alert("Unit does not belong to your properties");
        return;
      }

      // Proceed with deletion
      const { error: deleteError } = await supabase
        .from("units")
        .delete()
        .eq("id", unitId);

      if (deleteError) {
        console.error("Error deleting unit:", deleteError);
        alert("Error deleting unit: " + deleteError.message);
        return;
      }

      // Refresh the units list
      await fetchUnits();
    } catch (error) {
      console.error("Error deleting unit:", error);
      alert("Error deleting unit: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Units</h1>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Unit"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-50">
          <CardContent className="pt-6">
            <form onSubmit={addUnit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. Room 101"
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Property</label>
                  <select
                    name="propertyId"
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Floor</label>
                  <input
                    name="floor"
                    type="number"
                    min="0"
                    placeholder="Floor number"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price per Night ($)</label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Add Unit</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <>
          {isLoading ? (
            <p>Loading units...</p>
          ) : units.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">No units yet. Add your first unit to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {units.map((unit) => (
                <Card key={unit.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Floor {unit.floor}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[unit.status as keyof typeof statusColors]}`}
                      >
                        {unit.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg font-bold">${unit.price_per_night}/night</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => deleteUnit(unit.id)}
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
        </>
      )}
    </div>
  )
}

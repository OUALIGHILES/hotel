"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Lock } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/language-context";

interface Unit {
  id: string
  name: string
  floor: number
  price_per_night: number
  status: string
  main_picture_url?: string | null
  additional_pictures_urls?: string[] | null
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams();
  const { t } = useLanguage(); // Get the translation function

  // Check URL for city parameter on initial load
  useEffect(() => {
    if (searchParams) {
      const cityParam = searchParams.get('city');
      if (cityParam) {
        setSelectedCity(cityParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    checkAuthenticationAndFetchData();
  }, [selectedCity]); // Refetch data when selected city changes

  const checkAuthenticationAndFetchData = async () => {
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

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", userId);

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
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnits = async () => {
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
      setIsAuthenticated(false);
      router.push("/auth/login"); // Redirect to login
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
      const mainPictureFile = formData.get('mainPicture') as File | null;
      const additionalPicturesFiles = formData.getAll('additionalPictures') as File[];

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
        .eq("user_id", userId)
        .single();

      if (propertyError || !propertyData) {
        alert("Invalid property or property does not belong to you");
        return;
      }

      // Function to create a safe filename
      const createSafeFilename = (name: string, propertyId: string, fileName: string): string => {
        // Remove special characters and replace spaces with underscores
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `units/${userId}/${propertyId}/${cleanName}_${Date.now()}_${cleanFileName}`;
      };

      // Upload main picture if provided
      let mainPictureUrl = null;
      if (mainPictureFile && mainPictureFile.size > 0) {
        const mainPictureFileName = createSafeFilename(name, propertyId, mainPictureFile.name);
        const { data: mainPictureUpload, error: mainPictureError } = await supabase
          .storage
          .from('units')
          .upload(mainPictureFileName, mainPictureFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (mainPictureError) {
          console.error("Error uploading main picture:", mainPictureError);
          alert("Error uploading main picture: " + mainPictureError.message);
          return;
        }

        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('units')
          .getPublicUrl(mainPictureFileName);

        mainPictureUrl = publicUrl;
      }

      // Upload additional pictures if provided
      let additionalPicturesUrls: string[] = [];
      if (additionalPicturesFiles && additionalPicturesFiles.length > 0) {
        for (const file of additionalPicturesFiles) {
          if (file.size > 0) { // Only upload if file has content
            const additionalPictureFileName = createSafeFilename(name, propertyId, file.name);
            const { data: additionalUpload, error: additionalError } = await supabase
              .storage
              .from('units')
              .upload(additionalPictureFileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (additionalError) {
              console.error("Error uploading additional picture:", additionalError);
              alert("Error uploading additional pictures: " + additionalError.message);
              return;
            }

            // Get the public URL for the uploaded image
            const { data: { publicUrl } } = supabase
              .storage
              .from('units')
              .getPublicUrl(additionalPictureFileName);

            additionalPicturesUrls.push(publicUrl);
          }
        }
      }

      // Insert the new unit into the database with picture URLs
      const { data: insertedUnits, error: unitError } = await supabase
        .from("units")
        .insert([{
          name,
          floor,
          price_per_night: price,
          status: "vacant", // Default status
          property_id: propertyId,
          main_picture_url: mainPictureUrl,
          additional_pictures_urls: additionalPicturesUrls.length > 0 ? additionalPicturesUrls : null
        }])
        .select('id');

      if (unitError) {
        console.error("Error adding unit:", unitError);
        alert("Error adding unit: " + unitError.message);
        return;
      }

      // Get the property details to create a listing
      const { data: propertyDetails, error: propertyFetchError } = await supabase
        .from("properties")
        .select("name, address, city, country")
        .eq("id", propertyId)
        .single();

      if (propertyFetchError || !propertyDetails) {
        console.error("Error fetching property details for listing:", propertyFetchError);
        // Still refresh the units list even if listing creation fails
        await fetchUnits();
        setShowForm(false);
        alert("Unit added but listing creation failed. The property details couldn't be retrieved for public listing.");
        return;
      }

      // Create a corresponding listing for the unit in the listings table
      const listingName = `${propertyDetails.name} - ${name}`; // e.g., "Beach House - Unit 101"
      const { error: listingError } = await supabase
        .from("listings")
        .insert([{
          host_id: userId,
          title: listingName,
          description: `Comfortable unit in ${propertyDetails.name}. Perfect for your stay in ${propertyDetails.city}.`,
          price_per_night: price,
          currency: 'USD',
          property_type: 'Unit', // or 'Apartment', 'Hotel Room' based on your needs
          bedrooms: 1, // Default, you might want to add this as a field
          bathrooms: 1, // Default, you might want to add this as a field
          guests: 2, // Default, you might want to add this as a field
          address: propertyDetails.address,
          city: propertyDetails.city,
          country: propertyDetails.country,
          image_url: mainPictureUrl, // Use the unit's main picture as the listing image
          rating: 5.0, // Default high rating for new listings
          review_count: 0,
          is_active: true // Make it active by default
        }]);

      if (listingError) {
        console.error("Error creating listing:", listingError);
        // Still refresh the units list even if listing creation fails
        await fetchUnits();
        setShowForm(false);
        alert("Unit added successfully but there was an error creating the public listing.");
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
        .eq("user_id", userId)
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

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your units.
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

  // City options for the dropdown
  const cities = [
    { value: "Riyadh", name: t('riyadh') || "Riyadh", description: "Capital city" },
    { value: "Jeddah", name: t('jeddah') || "Jeddah", description: "Red Sea coastal city" },
    { value: "Dammam", name: t('dammam') || "Dammam", description: "Eastern Province" },
    { value: "Abha", name: t('abha') || "Abha", description: "Mountain city" },
    { value: "Al Khobar", name: t('alKhobar') || "Al Khobar", description: "Business hub" },
    { value: "Madinah", name: t('madinah') || "Madinah", description: "Holy city" },
  ];

  // Filter properties based on selected city
  const filteredProperties = selectedCity
    ? properties.filter(property => property.city === selectedCity)
    : properties;

  // Filter units based on selected city
  const filteredUnits = selectedCity
    ? units.filter(unit => {
        const property = properties.find(prop => prop.id === unit.property_id);
        return property && property.city === selectedCity;
      })
    : units;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Units</h1>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Unit"}
        </Button>
      </div>

      {/* City Filter */}
      <div className="bg-slate-50 p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium mb-1">Filter by City</label>
            <select
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value || null)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city.value} value={city.value}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          {selectedCity && (
            <div className="w-full md:w-auto mt-2 md:mt-0">
              <p className="text-sm text-muted-foreground">
                Showing units in {cities.find(c => c.value === selectedCity)?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={addUnit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. Room 101"
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <select
                    value={selectedCity || ""}
                    onChange={(e) => setSelectedCity(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                  >
                    <option value="">Select a city</option>
                    {cities.map(city => (
                      <option key={city.value} value={city.value}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Property</label>
                  <select
                    name="propertyId"
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">Select a property</option>
                    {filteredProperties.map(property => (
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
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
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
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Main Unit Picture</label>
                  <input
                    name="mainPicture"
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Additional Pictures</label>
                  <input
                    name="additionalPictures"
                    type="file"
                    accept="image/*"
                    multiple
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="md:col-span-2">
                  {filteredProperties.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No properties in this city. Please add a property in {selectedCity ? cities.find(c => c.value === selectedCity)?.name : 'selected'} city first.
                    </p>
                  )}
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
          ) : filteredUnits.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">No units found in this city. Add your first unit to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map((unit) => {
                // Find the property for this unit to get city info
                const property = properties.find(prop => prop.id === unit.property_id);
                return (
                  <Card key={unit.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{unit.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Floor {unit.floor}</p>
                          {property && (
                            <p className="text-xs text-muted-foreground">
                              {property.city}, {property.country}
                            </p>
                          )}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

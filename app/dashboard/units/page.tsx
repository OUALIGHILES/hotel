"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Lock, Printer, Download } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/language-context";

interface Unit {
  id: string
  name: string
  floor: number
  price_per_night: number
  bedrooms: number
  bathrooms: number
  max_guests: number
  status: string
  main_picture_url?: string | null
  additional_pictures_urls?: string[] | null
  tasks?: Task[]
}

interface Task {
  id: string
  title: string
  description: string
  priority: string
  status: string
  due_date: string
  property_id: string
  unit_id: string
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
      let { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("*")
        .in("property_id", propertyIds); // Filter by user's property IDs

      if (unitsError) throw unitsError;

      // For each unit, fetch its tasks
      const unitsWithTasks = await Promise.all(
        (unitsData || []).map(async (unit) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .eq("unit_id", unit.id)
            .in("status", ["pending", "in_progress"]); // Only show active tasks

          if (tasksError) {
            console.error("Error fetching tasks for unit:", unit.id, tasksError);
            return { ...unit, tasks: [] };
          }

          return { ...unit, tasks: tasksData || [] };
        })
      );

      setUnits(unitsWithTasks);
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
      let { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("*")
        .in("property_id", propertyIds); // Filter by user's property IDs

      if (unitsError) throw unitsError;

      // For each unit, fetch its tasks
      const unitsWithTasks = await Promise.all(
        (unitsData || []).map(async (unit) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .eq("unit_id", unit.id)
            .in("status", ["pending", "in_progress"]); // Only show active tasks

          if (tasksError) {
            console.error("Error fetching tasks for unit:", unit.id, tasksError);
            return { ...unit, tasks: [] };
          }

          return { ...unit, tasks: tasksData || [] };
        })
      );

      setUnits(unitsWithTasks);
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

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const addUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const floor = parseInt(formData.get('floor') as string) || 0;
      const price = parseFloat(formData.get('price') as string) || 0;
      const bedrooms = parseInt(formData.get('bedrooms') as string) || 1;
      const bathrooms = parseFloat(formData.get('bathrooms') as string) || 1;
      const maxGuests = parseInt(formData.get('maxGuests') as string) || 2;
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
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          max_guests: maxGuests,
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
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          guests: maxGuests,
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

  const editUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUnit) return;

    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const floor = parseInt(formData.get('floor') as string) || 0;
      const price = parseFloat(formData.get('price') as string) || 0;
      const bedrooms = parseInt(formData.get('bedrooms') as string) || 1;
      const bathrooms = parseFloat(formData.get('bathrooms') as string) || 1;
      const maxGuests = parseInt(formData.get('maxGuests') as string) || 2;
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

      // Handle main picture upload if provided
      let mainPictureUrl = editingUnit.main_picture_url; // Keep existing URL unless new file provided
      if (mainPictureFile && mainPictureFile.size > 0) {
        // Delete old image if it exists
        if (editingUnit.main_picture_url) {
          const oldImagePath = editingUnit.main_picture_url.split('/').slice(6).join('/'); // Extract path after the URL
          try {
            await supabase.storage.from('units').remove([oldImagePath]);
          } catch (err) {
            console.warn("Error deleting old image:", err);
          }
        }

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

      // Handle additional pictures if provided
      let additionalPicturesUrls = editingUnit.additional_pictures_urls || []; // Keep existing URLs unless new files provided
      if (additionalPicturesFiles && additionalPicturesFiles.length > 0) {
        // Delete old images if they exist
        if (editingUnit.additional_pictures_urls && editingUnit.additional_pictures_urls.length > 0) {
          const oldImagePaths = editingUnit.additional_pictures_urls.map(url => url.split('/').slice(6).join('/')); // Extract paths after the URL
          try {
            await supabase.storage.from('units').remove(oldImagePaths);
          } catch (err) {
            console.warn("Error deleting old additional images:", err);
          }
        }

        const newAdditionalUrls: string[] = [];
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

            newAdditionalUrls.push(publicUrl);
          }
        }
        additionalPicturesUrls = newAdditionalUrls;
      }

      // Update the unit in the database
      const { error: unitError } = await supabase
        .from("units")
        .update({
          name,
          floor,
          price_per_night: price,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          max_guests: maxGuests,
          property_id: propertyId,
          main_picture_url: mainPictureUrl,
          additional_pictures_urls: additionalPicturesUrls.length > 0 ? additionalPicturesUrls : null
        })
        .eq("id", editingUnit.id);

      if (unitError) {
        console.error("Error updating unit:", unitError);
        alert("Error updating unit: " + unitError.message);
        return;
      }

      // Update the corresponding listing in the listings table
      const { data: propertyDetails, error: propertyFetchError } = await supabase
        .from("properties")
        .select("name, address, city, country")
        .eq("id", propertyId)
        .single();

      if (propertyFetchError || !propertyDetails) {
        console.error("Error fetching property details for listing update:", propertyFetchError);
        // Still refresh the units list even if listing update fails
        await fetchUnits();
        setShowForm(false);
        setEditingUnit(null);
        alert("Unit updated but listing update failed. The property details couldn't be retrieved for public listing update.");
        return;
      }

      // Update the listing
      const listingName = `${propertyDetails.name} - ${name}`; // e.g., "Beach House - Unit 101"
      const { error: listingError } = await supabase
        .from("listings")
        .update({
          title: listingName,
          description: `Comfortable unit in ${propertyDetails.name}. Perfect for your stay in ${propertyDetails.city}.`,
          price_per_night: price,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          guests: maxGuests,
          address: propertyDetails.address,
          city: propertyDetails.city,
          country: propertyDetails.country,
          image_url: mainPictureUrl, // Use the unit's main picture as the listing image
        })
        .eq("host_id", userId)
        .ilike("title", `%${editingUnit.name}%`); // Find the listing by the old name

      if (listingError) {
        console.error("Error updating listing:", listingError);
        // Still refresh the units list even if listing update fails
        await fetchUnits();
        setShowForm(false);
        setEditingUnit(null);
        alert("Unit updated successfully but there was an error updating the public listing.");
        return;
      }

      // Refresh the units list
      await fetchUnits();
      setShowForm(false);
      setEditingUnit(null);
    } catch (error) {
      console.error("Error updating unit:", error);
      alert("Error updating unit: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30';
      case 'low':
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
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

  // Function to handle printing units
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Add CSS for print styling
    const printCSS = `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background: white;
          color: black;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .print-title {
          font-size: 24px;
          margin: 0;
          color: #2563eb;
        }
        .print-subtitle {
          font-size: 16px;
          color: #666;
          margin-top: 5px;
        }
        .print-date {
          text-align: right;
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-vacant { background-color: #d1fae5; color: #059669; }
        .status-occupied { background-color: #dbeafe; color: #2563eb; }
        .status-reserved { background-color: #fef3c7; color: #d97706; }
        .status-maintenance { background-color: #fee2e2; color: #ef4444; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    `;

    // Generate the print content
    const filteredUnits = selectedCity
      ? units.filter(unit => {
          const property = properties.find(prop => prop.id === unit.property_id);
          return property && property.city === selectedCity;
        })
      : units;

    let unitsHTML = `
      <div class="print-header">
        <h1 class="print-title">Units Report</h1>
        <div class="print-subtitle">Property Management System</div>
      </div>
      <div class="print-date">Generated on: ${new Date().toLocaleString()}</div>
    `;

    if (filteredUnits.length === 0) {
      unitsHTML += `<p>No units to display.</p>`;
    } else {
      unitsHTML += `
        <table>
          <thead>
            <tr>
              <th>Unit Name</th>
              <th>Floor</th>
              <th>Price/Night</th>
              <th>Status</th>
              <th>Property</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
      `;

      filteredUnits.forEach(unit => {
        const property = properties.find(prop => prop.id === unit.property_id);
        unitsHTML += `
          <tr>
            <td><strong>${unit.name}</strong></td>
            <td>${unit.floor || 'N/A'}</td>
            <td>$${unit.price_per_night?.toFixed(2) || '0.00'}</td>
            <td>
              <span class="status-badge status-${unit.status}">
                ${unit.status}
              </span>
            </td>
            <td>${property?.name || 'N/A'}</td>
            <td>${property?.city || 'N/A'}</td>
          </tr>
        `;
      });

      unitsHTML += `
          </tbody>
        </table>
      `;
    }

    unitsHTML += `
      <div class="footer">
        Generated by Welhost PMS | Page 1
      </div>
    `;

    // Write the content to the print window
    printWindow.document.write(`
      <html>
        <head>
          <title>Units Report - Welhost PMS</title>
          ${printCSS}
        </head>
        <body>
          ${unitsHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Function to handle downloading units as PDF
  const handleDownload = () => {
    // Create an HTML blob for PDF conversion
    const filteredUnits = selectedCity
      ? units.filter(unit => {
          const property = properties.find(prop => prop.id === unit.property_id);
          return property && property.city === selectedCity;
        })
      : units;

    let content = `
      <html>
        <head>
          <title>Units Report - Welhost PMS</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: white;
              color: black;
            }
            .print-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .print-title {
              font-size: 24px;
              margin: 0;
              color: #2563eb;
            }
            .print-subtitle {
              font-size: 16px;
              color: #666;
              margin-top: 5px;
            }
            .print-date {
              text-align: right;
              font-size: 14px;
              color: #888;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-vacant { background-color: #d1fae5; color: #059669; }
            .status-occupied { background-color: #dbeafe; color: #2563eb; }
            .status-reserved { background-color: #fef3c7; color: #d97706; }
            .status-maintenance { background-color: #fee2e2; color: #ef4444; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #888;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1 class="print-title">Units Report</h1>
            <div class="print-subtitle">Property Management System</div>
          </div>
          <div class="print-date">Generated on: ${new Date().toLocaleString()}</div>
    `;

    if (filteredUnits.length === 0) {
      content += `<p>No units to display.</p>`;
    } else {
      content += `
        <table>
          <thead>
            <tr>
              <th>Unit Name</th>
              <th>Floor</th>
              <th>Price/Night</th>
              <th>Status</th>
              <th>Property</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
      `;

      filteredUnits.forEach(unit => {
        const property = properties.find(prop => prop.id === unit.property_id);
        content += `
          <tr>
            <td><strong>${unit.name}</strong></td>
            <td>${unit.floor || 'N/A'}</td>
            <td>$${unit.price_per_night?.toFixed(2) || '0.00'}</td>
            <td>
              <span class="status-badge status-${unit.status}">
                ${unit.status}
              </span>
            </td>
            <td>${property?.name || 'N/A'}</td>
            <td>${property?.city || 'N/A'}</td>
          </tr>
        `;
      });

      content += `
          </tbody>
        </table>
      `;
    }

    content += `
          <div class="footer">
            Generated by Welhost PMS
          </div>
        </body>
      </html>
    `;

    // Create a Blob and download it
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `units_report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // In a real implementation, you might want to generate an actual PDF using a library like jsPDF
    // For now, we're creating an HTML file that can be opened in a browser and printed as PDF
  };

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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Print Units
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            Download Units
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              if (showForm) {
                // If form is currently showing and we're clicking the button, cancel it
                setShowForm(false);
                setEditingUnit(null); // Clear editing state when canceling
              } else {
                // If form is not showing and we're clicking the button, show it for adding
                setShowForm(true);
                setEditingUnit(null); // Clear any editing state when starting to add
              }
            }}
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "Add Unit"}
          </Button>
        </div>
      </div>

      {/* City Filter */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-foreground mb-1">Filter by City</label>
            <select
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value || null)}
              className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
        <Card className="border rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{editingUnit ? "Edit Unit" : "Add New Unit"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingUnit ? editUnit : addUnit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Unit Name</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingUnit?.name || ''}
                    placeholder="e.g. Room 101"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">City</label>
                  <select
                    value={selectedCity || ""}
                    onChange={(e) => setSelectedCity(e.target.value || null)}
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  >
                    <option value="">Select a city</option>
                    {cities.map(city => (
                      <option key={city.value} value={city.value}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Property</label>
                  <select
                    name="propertyId"
                    defaultValue={editingUnit?.property_id || ''}
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Floor</label>
                  <input
                    name="floor"
                    type="number"
                    min="0"
                    defaultValue={editingUnit?.floor || 0}
                    placeholder="Floor number"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Price per Night ($)</label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingUnit?.price_per_night || 0}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bedrooms</label>
                  <input
                    name="bedrooms"
                    type="number"
                    min="0"
                    defaultValue={editingUnit?.bedrooms || 1}
                    placeholder="Number of bedrooms"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bathrooms</label>
                  <input
                    name="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={editingUnit?.bathrooms || 1}
                    placeholder="Number of bathrooms"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Max Guests</label>
                  <input
                    name="maxGuests"
                    type="number"
                    min="1"
                    defaultValue={editingUnit?.max_guests || 2}
                    placeholder="Maximum number of guests"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Main Unit Picture</label>
                  <input
                    name="mainPicture"
                    type="file"
                    accept="image/*"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Additional Pictures</label>
                  <input
                    name="additionalPictures"
                    type="file"
                    accept="image/*"
                    multiple
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUnit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingUnit ? "Update Unit" : "Add Unit"}</Button>
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

                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{unit.bedrooms} {unit.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</span>
                        <span>{unit.bathrooms} {unit.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</span>
                        <span>Guests: {unit.max_guests}</span>
                      </div>

                      {/* Display associated tasks */}
                      {unit.tasks && unit.tasks.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Tasks:</p>
                          <div className="space-y-1">
                            {unit.tasks.map((task) => (
                              <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                <span className="truncate max-w-[70%]">{task.title}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityClass(task.priority)}`}>
                                  {task.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1 bg-transparent"
                          onClick={() => {
                            setEditingUnit(unit);
                            setShowForm(true);
                          }}
                        >
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

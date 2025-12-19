"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Lock, Printer, Download, Eye, EyeOff, X, Camera, Users, Bed, Bath, MapPin, DollarSign, Home, Building2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/language-context";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/image-upload";
import { validateAndCorrectImageFile } from "@/lib/utils/file-validation";

// Added to force Git to detect changes in the file

interface Unit {
  id: string
  name: string
  floor: number
  price_per_night: number
  bedrooms: number
  bathrooms: number
  max_guests: number
  status: string
  is_visible: boolean
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
        .select("*") // Include all columns including is_visible
        .in("property_id", propertyIds) // Filter by user's property IDs
        .is("is_deleted", false); // Exclude soft-deleted units

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
        .select("*") // Include all columns including is_visible
        .in("property_id", propertyIds) // Filter by user's property IDs
        .is("is_deleted", false); // Exclude soft-deleted units

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
  const [selectedUnitImages, setSelectedUnitImages] = useState<{unitId: string, images: string[]} | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);

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
      // Use the state variables instead of form data for images
      const mainPictureFile = mainImageFile; // Use the state variable
      const additionalPicturesFiles = additionalImageFiles; // Use the state variable

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
        // Validate and correct the file using our utility function
        const { file: validatedMainPictureFile, error: validationError } = await validateAndCorrectImageFile(mainPictureFile, 'Main picture');

        if (validationError) {
          alert(validationError);
          return;
        }

        const mainPictureFileName = createSafeFilename(name, propertyId, validatedMainPictureFile.name);

        // Ensure we're uploading with correct file extension-based approach
        // Get the file extension and ensure it's properly included in the filename
        const fileExtension = validatedMainPictureFile.name.split('.').pop()?.toLowerCase();
        const fileNameParts = mainPictureFileName.split('.');
        const correctedFileName = fileExtension ? `${fileNameParts.slice(0, -1).join('.')}.${fileExtension}` : mainPictureFileName;

        const { data: mainPictureUpload, error: mainPictureError } = await supabase
          .storage
          .from('units')
          .upload(correctedFileName, validatedMainPictureFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (mainPictureError) {
          console.error("Error uploading main picture:", mainPictureError);

          // Check for different types of errors
          if (mainPictureError.message.includes('mime type') && mainPictureError.message.includes('is not supported')) {
            alert("MIME type error during upload: " + mainPictureError.message + ". Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.");
          } else if (mainPictureError.message.includes('permission') || mainPictureError.message.includes('auth') || mainPictureError.message.includes('policy')) {
            alert("Permission error: Unable to upload image. This may be due to storage bucket configuration. Please contact an administrator or check the bucket policies for the 'units' bucket in Supabase dashboard.");
          } else {
            alert("Error uploading main picture: " + mainPictureError.message + ". If this continues, please check your storage configuration in Supabase dashboard.");
          }
          return;
        }

        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('units')
          .getPublicUrl(correctedFileName);

        mainPictureUrl = publicUrl;
      }

      // Upload additional pictures if provided
      let additionalPicturesUrls: string[] = [];
      if (additionalPicturesFiles && additionalPicturesFiles.length > 0) {
        for (const file of additionalPicturesFiles) {
          if (file.size > 0) { // Only upload if file has content
            // Validate and correct the file using our utility function
            const { file: validatedFile, error: validationError } = await validateAndCorrectImageFile(file, `Additional picture (${file.name})`);

            if (validationError) {
              alert(validationError);
              return;
            }

            const additionalPictureFileName = createSafeFilename(name, propertyId, validatedFile.name);
            const { data: additionalUpload, error: additionalError } = await supabase
              .storage
              .from('units')
              .upload(additionalPictureFileName, validatedFile, {
                cacheControl: '3600',
                upsert: false
              });

            if (additionalError) {
              console.error("Error uploading additional picture:", additionalError);

              // Check for different types of errors
              if (additionalError.message.includes('mime type') && additionalError.message.includes('is not supported')) {
                alert(`MIME type error during upload of ${file.name}: ${additionalError.message}. Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.`);
                return;
              } else if (additionalError.message.includes('permission') || additionalError.message.includes('auth') || additionalError.message.includes('policy')) {
                alert(`Permission error: Unable to upload image ${file.name}. This may be due to storage bucket configuration. Please contact an administrator or check the bucket policies for the 'units' bucket in Supabase dashboard.`);
                return;
              } else {
                alert("Error uploading additional pictures: " + additionalError.message + ". If this continues, please check your storage configuration in Supabase dashboard.");
                return;
              }
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
          user_id: userId, // Add user_id for RLS policy compliance
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
        // Clear the image states
        setMainImageFile(null);
        setAdditionalImageFiles([]);
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
          is_active: true, // Make it active by default
          is_visible: true // Make it visible by default
        }]);

      if (listingError) {
        console.error("Error creating listing:", listingError);
        // Still refresh the units list even if listing creation fails
        await fetchUnits();
        setShowForm(false);
        // Clear the image states
        setMainImageFile(null);
        setAdditionalImageFiles([]);
        alert("Unit added successfully but there was an error creating the public listing.");
        return;
      }

      // Refresh the units list
      await fetchUnits();
      setShowForm(false);
      // Clear the image states
      setMainImageFile(null);
      setAdditionalImageFiles([]);
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
      // Use the state variables instead of form data for images
      const mainPictureFile = mainImageFile; // Use the state variable
      const additionalPicturesFiles = additionalImageFiles; // Use the state variable

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
        // Validate and correct the file using our utility function
        const { file: validatedMainPictureFile, error: validationError } = await validateAndCorrectImageFile(mainPictureFile, 'Main picture');

        if (validationError) {
          alert(validationError);
          return;
        }

        // Delete old image if it exists
        if (editingUnit.main_picture_url) {
          const oldImagePath = editingUnit.main_picture_url.split('/').slice(6).join('/'); // Extract path after the URL
          try {
            await supabase.storage.from('units').remove([oldImagePath]);
          } catch (err) {
            console.warn("Error deleting old image:", err);
          }
        }

        const mainPictureFileName = createSafeFilename(name, propertyId, validatedMainPictureFile.name);
        // Ensure we're uploading with correct file extension-based approach
        // Get the file extension and ensure it's properly included in the filename
        const fileExtension = validatedMainPictureFile.name.split('.').pop()?.toLowerCase();
        const fileNameParts = mainPictureFileName.split('.');
        const correctedFileName = fileExtension ? `${fileNameParts.slice(0, -1).join('.')}.${fileExtension}` : mainPictureFileName;

        const { data: mainPictureUpload, error: mainPictureError } = await supabase
          .storage
          .from('units')
          .upload(correctedFileName, validatedMainPictureFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (mainPictureError) {
          console.error("Error uploading main picture:", mainPictureError);

          // Check for different types of errors
          if (mainPictureError.message.includes('mime type') && mainPictureError.message.includes('is not supported')) {
            alert("MIME type error during upload: " + mainPictureError.message + ". Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.");
          } else if (mainPictureError.message.includes('permission') || mainPictureError.message.includes('auth') || mainPictureError.message.includes('policy')) {
            alert("Permission error: Unable to upload image. This may be due to storage bucket configuration. Please contact an administrator or check the bucket policies for the 'units' bucket in Supabase dashboard.");
          } else {
            alert("Error uploading main picture: " + mainPictureError.message + ". If this continues, please check your storage configuration in Supabase dashboard.");
          }
          return;
        }

        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('units')
          .getPublicUrl(correctedFileName);

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
            // Validate and correct the file using our utility function
            const { file: validatedFile, error: validationError } = await validateAndCorrectImageFile(file, `Additional picture (${file.name})`);

            if (validationError) {
              alert(validationError);
              return;
            }

            const additionalPictureFileName = createSafeFilename(name, propertyId, validatedFile.name);

            // Ensure we're uploading with correct file extension-based approach
            // Get the file extension and ensure it's properly included in the filename
            const fileExtension = validatedFile.name.split('.').pop()?.toLowerCase();
            const fileNameParts = additionalPictureFileName.split('.');
            const correctedFileName = fileExtension ? `${fileNameParts.slice(0, -1).join('.')}.${fileExtension}` : additionalPictureFileName;

            const { data: additionalUpload, error: additionalError } = await supabase
              .storage
              .from('units')
              .upload(correctedFileName, validatedFile, {
                cacheControl: '3600',
                upsert: false
              });

            if (additionalError) {
              console.error("Error uploading additional picture:", additionalError);

              // Check for different types of errors
              if (additionalError.message.includes('mime type') && additionalError.message.includes('is not supported')) {
                alert(`MIME type error during upload of ${file.name}: ${additionalError.message}. Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.`);
                return;
              } else if (additionalError.message.includes('permission') || additionalError.message.includes('auth') || additionalError.message.includes('policy')) {
                alert(`Permission error: Unable to upload image ${file.name}. This may be due to storage bucket configuration. Please contact an administrator or check the bucket policies for the 'units' bucket in Supabase dashboard.`);
                return;
              } else {
                alert("Error uploading additional pictures: " + additionalError.message + ". If this continues, please check your storage configuration in Supabase dashboard.");
                return;
              }
            }

            // Get the public URL for the uploaded image
            const { data: { publicUrl } } = supabase
              .storage
              .from('units')
              .getPublicUrl(correctedFileName);

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
        .eq("id", editingUnit.id)
        .eq("user_id", userId); // Ensure user can only update their own units

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
        // Clear the image states
        setMainImageFile(null);
        setAdditionalImageFiles([]);
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
          is_visible: editingUnit.is_visible // Preserve the visibility setting
        })
        .eq("host_id", userId)
        .eq("title", `${propertyDetails.name} - ${editingUnit.name}`); // Find the specific listing by exact title

      if (listingError) {
        console.error("Error updating listing:", listingError);
        // Still refresh the units list even if listing update fails
        await fetchUnits();
        setShowForm(false);
        setEditingUnit(null);
        // Clear the image states
        setMainImageFile(null);
        setAdditionalImageFiles([]);
        alert("Unit updated successfully but there was an error updating the public listing.");
        return;
      }

      // Refresh the units list
      await fetchUnits();
      setShowForm(false);
      setEditingUnit(null);
      // Clear the image states
      setMainImageFile(null);
      setAdditionalImageFiles([]);
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

  const toggleUnitVisibility = async (unitId: string, isCurrentlyVisible: boolean) => {
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

      // Update the unit's visibility in the database
      const { error: updateError } = await supabase
        .from("units")
        .update({ is_visible: !isCurrentlyVisible })
        .eq("id", unitId);

      if (updateError) {
        console.error("Error updating unit visibility:", updateError);
        alert("Error updating unit visibility: " + updateError.message);
        return;
      }

      // Also update the corresponding listing in the listings table
      const { error: listingError } = await supabase
        .from("listings")
        .update({
          is_active: !isCurrentlyVisible,
          is_visible: !isCurrentlyVisible  // Update the visibility field as well
        })
        .ilike("title", `%${unitData.name}%`) // Find the listing by unit name
        .eq("host_id", userId);

      if (listingError) {
        console.error("Error updating listing visibility:", listingError);
        // Don't return here - still refresh the units list
      }

      // Refresh the units list
      await fetchUnits();
    } catch (error) {
      console.error("Error toggling unit visibility:", error);
      alert("Error toggling unit visibility: " + (error as Error).message);
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
        .select("property_id, name")
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

      // Proceed with soft deletion - update the is_deleted column
      const { error: updateError } = await supabase
        .from("units")
        .update({ is_deleted: true })
        .eq("id", unitId);

      if (updateError) {
        console.error("Error soft deleting unit:", updateError);
        alert("Error deleting unit: " + updateError.message);
        return;
      }

      // Also update the corresponding listing in the listings table to make it inactive
      const { error: listingError } = await supabase
        .from("listings")
        .update({
          is_active: false,
          is_visible: false
        })
        .ilike("title", `%${unitData.name}%`) // Find the listing by unit name
        .eq("host_id", userId);

      if (listingError) {
        console.error("Error updating listing status:", listingError);
        // Don't return here - still refresh the units list
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

  // Function to open the image gallery for a unit
  const openImageGallery = (unit: Unit) => {
    const allImages = [unit.main_picture_url, ...(unit.additional_pictures_urls || [])]
      .filter((url): url is string => url !== null && url !== undefined) as string[];
    setSelectedUnitImages({
      unitId: unit.id,
      images: allImages
    });
  };

  // Function to close the image gallery
  const closeImageGallery = () => {
    setSelectedUnitImages(null);
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery Modal */}
      {selectedUnitImages && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Unit Images</h3>
              <Button variant="ghost" size="icon" onClick={closeImageGallery}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {selectedUnitImages.images.map((img, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={img}
                      alt={`Unit image ${index + 1}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={closeImageGallery}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
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
                setMainImageFile(null);
                setAdditionalImageFiles([]);
              } else {
                // If form is not showing and we're clicking the button, show it for adding
                setShowForm(true);
                setEditingUnit(null); // Clear any editing state when starting to add
                setMainImageFile(null);
                setAdditionalImageFiles([]);
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
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 -z-10 rounded-3xl"></div>
          <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30">
              <div className="bg-card rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {editingUnit ? "Update Property Unit" : "Add New Unit"}
                    </h2>
                    <p className="text-muted-foreground">
                      {editingUnit
                        ? "Modify the details of your existing unit"
                        : "Create a new unit for your property"}
                    </p>
                  </div>
                </div>

                <form onSubmit={editingUnit ? editUnit : addUnit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Home className="w-4 h-4 text-primary" />
                          Unit Name
                        </label>
                        <input
                          name="name"
                          type="text"
                          defaultValue={editingUnit?.name || ''}
                          placeholder="e.g. Presidential Suite"
                          className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                          required
                        />
                        <p className="text-xs text-muted-foreground">Enter a descriptive name for this unit</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Property
                        </label>
                        <select
                          name="propertyId"
                          defaultValue={editingUnit?.property_id || ''}
                          className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                          required
                        >
                          <option value="">Select a property</option>
                          {properties.map(property => (
                            <option key={property.id} value={property.id}>
                              {property.name} ({property.city})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">Choose the property where this unit is located</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Home className="w-4 h-4 text-primary" />
                          Floor Level
                        </label>
                        <input
                          name="floor"
                          type="number"
                          min="0"
                          defaultValue={editingUnit?.floor || 0}
                          placeholder="Which floor is this unit on?"
                          className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                          required
                        />
                        <p className="text-xs text-muted-foreground">Enter the floor number (0 for ground floor)</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Price per Night ($)
                        </label>
                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={editingUnit?.price_per_night || 0}
                          placeholder="0.00"
                          className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                          required
                        />
                        <p className="text-xs text-muted-foreground">Set the nightly rate for this unit</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Bed className="w-4 h-4 text-primary" />
                            Bedrooms
                          </label>
                          <input
                            name="bedrooms"
                            type="number"
                            min="0"
                            defaultValue={editingUnit?.bedrooms || 1}
                            placeholder="0"
                            className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Bath className="w-4 h-4 text-primary" />
                            Bathrooms
                          </label>
                          <input
                            name="bathrooms"
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={editingUnit?.bathrooms || 1}
                            placeholder="0"
                            className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Max Guests
                        </label>
                        <input
                          name="maxGuests"
                          type="number"
                          min="1"
                          defaultValue={editingUnit?.max_guests || 2}
                          placeholder="Maximum number of guests"
                          className="w-full px-4 py-4 border-2 border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                          required
                        />
                        <p className="text-xs text-muted-foreground">How many guests can this unit accommodate?</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-8">
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <Camera className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">Unit Images</h3>
                          <p className="text-sm text-muted-foreground">Upload high-quality images to showcase your unit</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-background rounded-xl border border-border shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Home className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-foreground">Main Unit Picture</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Upload the main picture of the unit. This will be the primary image displayed for this unit.</p>

                        <div className="space-y-6">
                          {/* Main Image Upload */}
                          <div className="space-y-3">
                            <input
                              type="file"
                              id="mainImage"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];

                                  // Validate that the file is an actual File object
                                  if (!(file instanceof File)) {
                                    console.error("Selected file is not a proper File object:", file);
                                    alert('Invalid file object. Please reselect the image.');
                                    return;
                                  }

                                  // Validate that the file is an image
                                  if (!file.type || !file.type.startsWith('image/')) {
                                    // Try to determine the correct MIME type from the file extension
                                    const fileExtension = file.name.split('.').pop()?.toLowerCase();
                                    const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];

                                    if (fileExtension && validImageExtensions.includes(fileExtension)) {
                                      // Create a new file with the correct MIME type
                                      const mimeTypes: Record<string, string> = {
                                        'jpg': 'image/jpeg',
                                        'jpeg': 'image/jpeg',
                                        'png': 'image/png',
                                        'gif': 'image/gif',
                                        'webp': 'image/webp',
                                        'bmp': 'image/bmp',
                                        'svg': 'image/svg+xml',
                                        'tiff': 'image/tiff',
                                        'ico': 'image/x-icon',
                                        'apng': 'image/apng',
                                        'avif': 'image/avif'
                                      };

                                      const correctedMimeType = mimeTypes[fileExtension] || 'image/jpeg';
                                      const validatedFile = new File([file], file.name, {
                                        type: correctedMimeType,
                                        lastModified: file.lastModified
                                      });

                                      setMainImageFile(validatedFile);
                                    } else {
                                      alert(`File ${file.name} extension (.${fileExtension}) is not supported. Please use one of the following formats: ${validImageExtensions.join(', ')}`);
                                      return;
                                    }
                                  } else {
                                    setMainImageFile(file);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('mainImage')?.click()}
                              className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Select Main Image
                            </button>

                            {mainImageFile && (
                              <div className="preview mt-3">
                                <Image
                                  src={URL.createObjectURL(mainImageFile)}
                                  alt="Main preview"
                                  width={220}
                                  height={140}
                                  className="w-full max-w-xs object-cover rounded-lg shadow-sm"
                                />
                              </div>
                            )}

                            {!mainImageFile && editingUnit?.main_picture_url && (
                              <div className="preview mt-3">
                                <Image
                                  src={editingUnit.main_picture_url}
                                  alt="Main preview"
                                  width={220}
                                  height={140}
                                  className="w-full max-w-xs object-cover rounded-lg shadow-sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* Additional Images Upload */}
                          <div className="space-y-3">
                            <input
                              type="file"
                              id="additionalImages"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const newFiles = Array.from(e.target.files);
                                  const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];
                                  const validatedFiles: File[] = [];

                                  for (const file of newFiles) {
                                    // Validate that the file is an actual File object
                                    if (!(file instanceof File)) {
                                      console.error("One of the selected files is not a proper File object:", file);
                                      alert('Invalid file object. Please reselect the images.');
                                      return;
                                    }

                                    // Validate that the file is an image
                                    if (!file.type || !file.type.startsWith('image/')) {
                                      // Try to determine the correct MIME type from the file extension
                                      const fileExtension = file.name.split('.').pop()?.toLowerCase();

                                      if (fileExtension && validImageExtensions.includes(fileExtension)) {
                                        // Create a new file with the correct MIME type
                                        const mimeTypes: Record<string, string> = {
                                          'jpg': 'image/jpeg',
                                          'jpeg': 'image/jpeg',
                                          'png': 'image/png',
                                          'gif': 'image/gif',
                                          'webp': 'image/webp',
                                          'bmp': 'image/bmp',
                                          'svg': 'image/svg+xml',
                                          'tiff': 'image/tiff',
                                          'ico': 'image/x-icon',
                                          'apng': 'image/apng',
                                          'avif': 'image/avif'
                                        };

                                        const correctedMimeType = mimeTypes[fileExtension] || 'image/jpeg';
                                        const validatedFile = new File([file], file.name, {
                                          type: correctedMimeType,
                                          lastModified: file.lastModified
                                        });

                                        validatedFiles.push(validatedFile);
                                      } else {
                                        alert(`File ${file.name} extension (.${fileExtension}) is not supported. Please use one of the following formats: ${validImageExtensions.join(', ')}`);
                                        continue; // Skip this file
                                      }
                                    } else {
                                      validatedFiles.push(file);
                                    }
                                  }

                                  if (validatedFiles.length > 0) {
                                    setAdditionalImageFiles(prev => [...prev, ...validatedFiles]);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('additionalImages')?.click()}
                              className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Add Images
                            </button>

                            {(additionalImageFiles.length > 0 || (editingUnit?.additional_pictures_urls && editingUnit.additional_pictures_urls.length > 0)) && (
                              <div className="preview-grid mt-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                  {additionalImageFiles.map((file, index) => (
                                    <div key={`new-${index}`} className="relative group">
                                      <Image
                                        src={URL.createObjectURL(file)}
                                        alt={`Additional ${index}`}
                                        width={90}
                                        height={90}
                                        className="w-full object-cover rounded-md shadow-sm"
                                      />
                                      <button
                                        type="button"
                                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const updated = additionalImageFiles.filter((_, i) => i !== index);
                                          setAdditionalImageFiles(updated);
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}

                                  {editingUnit?.additional_pictures_urls && editingUnit.additional_pictures_urls.map((url, index) => (
                                    <div key={`existing-${index}`} className="relative group">
                                      <Image
                                        src={url}
                                        alt={`Additional ${index}`}
                                        width={90}
                                        height={90}
                                        className="w-full object-cover rounded-md shadow-sm"
                                      />
                                      <button
                                        type="button"
                                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // For existing images, we would need to handle removal differently
                                          // This would require more complex logic to track which images to remove
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}

                                  {additionalImageFiles.length < 20 && (
                                    <div className="w-full flex items-center justify-center border border-dashed border-border rounded-md h-22.5">
                                      <span className="text-sm text-muted-foreground">+{Math.max(0, 20 - additionalImageFiles.length)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {properties.length === 0 && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
                      <p className="text-sm text-muted-foreground italic">
                        You don't have any properties yet. Please add a property first before adding units.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-4 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-8 py-5 text-base font-semibold hover:bg-accent transition-all duration-200"
                      onClick={() => {
                        setShowForm(false);
                        setEditingUnit(null);
                        setMainImageFile(null);
                        setAdditionalImageFiles([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 rounded-full px-10 py-5 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {editingUnit ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {editingUnit ? "Update Unit" : "Create Unit"}
                      </div>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading units...</p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <Card className="text-center py-16 border-2 border-dashed">
              <div className="flex justify-center mb-4">
                <Home className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No units found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                You haven't added any units yet. Add your first unit to start managing your properties.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredUnits.map((unit) => {
                // Find the property for this unit to get city info
                const property = properties.find(prop => prop.id === unit.property_id);

                return (
                  <Card
                    key={unit.id}
                    className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-card to-background"
                  >
                    <div className="flex flex-col md:flex-row rounded-xl border bg-background overflow-hidden">
                      {/* Unit Image */}
                      <div className="md:w-1/4 relative min-h-48 md:min-h-0">
                        {unit.main_picture_url ? (
                          <div
                            className="bg-muted relative w-full h-48 md:h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            onClick={() => openImageGallery(unit)}
                          >
                            <Image
                              src={unit.main_picture_url}
                              alt={unit.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            {unit.additional_pictures_urls && unit.additional_pictures_urls.length > 0 && (
                              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                {unit.additional_pictures_urls.length}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="bg-muted flex items-center justify-center w-full h-48 md:h-full cursor-pointer"
                            onClick={() => openImageGallery(unit)}
                          >
                            <div className="text-muted-foreground text-center p-4">
                              <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                                <Camera className="w-5 h-5" />
                              </div>
                              <p className="text-sm">No Image</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Unit Details */}
                      <div className="md:w-3/4 flex flex-col p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold tracking-tight">{unit.name}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[unit.status as keyof typeof statusColors]}`}>
                                {unit.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-4 h-4" />
                                <span>{property?.name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{property?.city || 'N/A'}, {property?.country || ''}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Home className="w-4 h-4" />
                                <span>Floor {unit.floor || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-xl text-center min-w-[120px]">
                            <div className="text-2xl font-bold text-primary">
                              ${unit.price_per_night}
                            </div>
                            <div className="text-xs text-muted-foreground">per night</div>
                          </div>
                        </div>

                        {/* Unit Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <Bed className="w-5 h-5 text-primary mb-1" />
                            <div className="text-sm font-medium">{unit.bedrooms}</div>
                            <div className="text-xs text-muted-foreground">{unit.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</div>
                          </div>
                          <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <Bath className="w-5 h-5 text-primary mb-1" />
                            <div className="text-sm font-medium">{unit.bathrooms}</div>
                            <div className="text-xs text-muted-foreground">{unit.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</div>
                          </div>
                          <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <Users className="w-5 h-5 text-primary mb-1" />
                            <div className="text-sm font-medium">{unit.max_guests}</div>
                            <div className="text-xs text-muted-foreground">Guests</div>
                          </div>
                          <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary mb-1" />
                            <div className="text-sm font-medium">{unit.floor || 0}</div>
                            <div className="text-xs text-muted-foreground">Floor</div>
                          </div>
                        </div>

                        {/* Unit Tasks */}
                        {unit.tasks && unit.tasks.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <p className="text-sm font-medium text-foreground">Active Tasks</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {unit.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${getPriorityClass(task.priority)}`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                  <span>{task.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-muted">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-full px-4"
                            onClick={() => {
                              setEditingUnit(unit);
                              setMainImageFile(null); // No new main file initially
                              setAdditionalImageFiles([]); // No new additional files initially
                              setShowForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant={unit.is_visible ? "outline" : "secondary"}
                            size="sm"
                            className="gap-2 rounded-full px-4"
                            onClick={() => toggleUnitVisibility(unit.id, unit.is_visible)}
                            title={unit.is_visible ? "Hide from homepage" : "Show on homepage"}
                          >
                            {unit.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {unit.is_visible ? "Hide" : "Show"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-full px-4"
                            onClick={() => deleteUnit(unit.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
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

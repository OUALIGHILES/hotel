"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, MapPin, Clock, Lock } from "lucide-react"
import { useLanguage } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { validateAndCorrectImageFile } from "@/lib/utils/file-validation";

// Added to force Git to detect changes in the file

interface Property {
  id: string
  name: string
  address: string
  city: string
  country: string
  check_in_time: string
  check_out_time: string
  currency: string
  main_picture_url?: string | null
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
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
      let mainImageUrl = null;

      // Insert the new property into the database first to get the property ID
      const { data: insertedProperty, error } = await supabase
        .from("properties")
        .insert([{
          name,
          address,
          city,
          country,
          user_id: userId, // Use user ID from API response
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          currency: "USD", // Default currency
        }])
        .select('id') // Get the inserted property ID
        .single();

      if (error) {
        console.error("Error adding property:", error);
        alert("Error adding property: " + error.message);
        return;
      }

      // Function to create a safe filename
      const createSafeFilename = (name: string, propertyId: string, fileName: string): string => {
        // Remove special characters and replace spaces with underscores
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `properties/${userId}/${propertyId}/${cleanName}_${Date.now()}_${cleanFileName}`;
      };

      // Upload main picture if provided (after property is created so we have the property ID)
      const mainPictureFile = mainImageFile;
      if (mainPictureFile && mainPictureFile.size > 0) {
        // Validate and correct the file using our utility function
        const { file: validatedFile, error: validationError } = await validateAndCorrectImageFile(mainPictureFile, 'Property picture');

        if (validationError) {
          alert(validationError);
          return;
        }

        const mainPictureFileName = createSafeFilename(name, insertedProperty.id, validatedFile.name);

        const { data: mainPictureUpload, error: mainPictureError } = await supabase
          .storage
          .from('units') // Store in the "units" bucket as requested
          .upload(mainPictureFileName, validatedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (mainPictureError) {
          console.error("Error uploading main picture:", mainPictureError);

          // Check for different types of errors
          if (mainPictureError.message.includes('mime type') && mainPictureError.message.includes('is not supported')) {
            alert(`MIME type error during upload: ${mainPictureError.message}. Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.`);
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
          .getPublicUrl(mainPictureFileName);

        mainImageUrl = publicUrl;

        // Update the property record with the image URL
        const { error: updateError } = await supabase
          .from("properties")
          .update({ main_picture_url: mainImageUrl })
          .eq("id", insertedProperty.id)
          .eq("user_id", userId); // Security: ensure user can only update their own property

        if (updateError) {
          console.error("Error updating property with image URL:", updateError);
          alert("Property created, but there was an error saving the image: " + updateError.message);
        }
      }

      // Refresh the properties list
      await checkAuthenticationAndFetchProperties();
      setShowForm(false);
      // Clear the image state
      setMainImageFile(null);
    } catch (error) {
      console.error("Error adding property:", error);
      alert("Error adding property: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

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

  const updateProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProperty) return;

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
      let mainImageUrl = editingProperty.main_picture_url; // Start with existing URL

      // Update the property in the database
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          name,
          address,
          city,
          country,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
        })
        .eq("id", editingProperty.id)
        .eq("user_id", userId); // Security: ensure user can only update their own property

      if (updateError) {
        console.error("Error updating property:", updateError);
        alert("Error updating property: " + updateError.message);
        return;
      }

      // Handle image update if a new image was selected
      const imageFile = editImageFile;
      if (imageFile && imageFile.size > 0) {
        // Validate and correct the file using our utility function
        const { file: validatedFile, error: validationError } = await validateAndCorrectImageFile(imageFile, 'Property picture');

        if (validationError) {
          alert(validationError);
          return;
        }

        // Check file type and handle potential JSON MIME type issue after reconstruction
        if (validatedFile.type === 'application/json') {
          console.error("File has JSON MIME type which is not allowed for images:", validatedFile);
          alert('File has invalid JSON MIME type. Please ensure you are uploading a valid image file.');
          return;
        }

        // Function to create a safe filename
        const createSafeFilename = (name: string, propertyId: string, fileName: string): string => {
          // Remove special characters and replace spaces with underscores
          const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
          const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          return `properties/${userId}/${propertyId}/${cleanName}_${Date.now()}_${cleanFileName}`;
        };

        const imageFileName = createSafeFilename(name, editingProperty.id, validatedFile.name); // Use corrected file

        // First delete the old image if it exists and is different from new one
        if (editingProperty.main_picture_url) {
          const oldImagePath = editingProperty.main_picture_url.substring(editingProperty.main_picture_url.lastIndexOf('/'));
          if (oldImagePath !== imageFileName) {
            try {
              await supabase.storage.from('units').remove([oldImagePath]);
            } catch (delError) {
              console.warn("Could not delete old image:", delError);
            }
          }
        }

        const { data: imageUpload, error: imageUploadError } = await supabase
          .storage
          .from('units') // Store in the "units" bucket as requested
          .upload(imageFileName, validatedFile, {
            cacheControl: '3600',
            upsert: true // Allow overwriting the same filename
          });

        if (imageUploadError) {
          console.error("Error uploading property image:", imageUploadError);

          // Check for different types of errors
          if (imageUploadError.message.includes('mime type') && imageUploadError.message.includes('is not supported')) {
            alert(`MIME type error during upload: ${imageUploadError.message}. Supported formats include JPG, PNG, GIF, WEBP, BMP, SVG, and more. Please ensure you're uploading a valid image file and try again.`);
          } else if (imageUploadError.message.includes('permission') || imageUploadError.message.includes('auth') || imageUploadError.message.includes('policy')) {
            alert("Permission error: Unable to upload image. This may be due to storage bucket configuration. Please contact an administrator or check the bucket policies for the 'units' bucket in Supabase dashboard.");
          } else {
            alert("Error uploading property image: " + imageUploadError.message + ". If this continues, please check your storage configuration in Supabase dashboard.");
          }
          return;
        }

        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('units')
          .getPublicUrl(imageFileName);

        mainImageUrl = publicUrl;

        // Update the property record with the new image URL
        const { error: imageUrlUpdateError } = await supabase
          .from("properties")
          .update({ main_picture_url: mainImageUrl })
          .eq("id", editingProperty.id)
          .eq("user_id", userId); // Security: ensure user can only update their own property

        if (imageUrlUpdateError) {
          console.error("Error updating property with image URL:", imageUrlUpdateError);
          alert("Property updated, but there was an error saving the image: " + imageUrlUpdateError.message);
        }
      }

      // Refresh the properties list
      await checkAuthenticationAndFetchProperties();
      setEditingProperty(null);
      setEditImageFile(null);
    } catch (error) {
      console.error("Error updating property:", error);
      alert("Error updating property: " + (error as Error).message);
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
        <Card className="border rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Add New Property</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addProperty} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Property Name</label>
                  <input name="name" type="text" placeholder="Property Name" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <input name="address" type="text" placeholder="Address" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('city')}</label>
                  <select name="city" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" required>
                    <option value="">{t('selectCityPlaceholder')}</option>
                    <option value="Riyadh">{t('riyadh')}</option>
                    <option value="Jeddah">{t('jeddah')}</option>
                    <option value="Dammam">{t('dammam')}</option>
                    <option value="Abha">{t('abha')}</option>
                    <option value="Al Khobar">{t('alKhobar')}</option>
                    <option value="Madinah">{t('madinah')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Country</label>
                  <input name="country" type="text" placeholder="Country" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Check-in Time</label>
                  <input name="check_in_time" type="time" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" defaultValue="14:00" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Check-out Time</label>
                  <input name="check_out_time" type="time" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" defaultValue="11:00" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Property Picture</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                      {mainImageFile ? (
                        <div className="relative w-full h-full">
                          <img
                            src={URL.createObjectURL(mainImageFile)}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload</p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setMainImageFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    {mainImageFile && (
                      <button
                        type="button"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => setMainImageFile(null)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Property</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <Card className="border rounded-xl shadow-lg fixed inset-0 max-w-2xl mx-auto my-16 z-50 bg-background p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Edit Property</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProperty} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Property Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Property Name"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <input
                    name="address"
                    type="text"
                    placeholder="Address"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.address}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('city')}</label>
                  <select
                    name="city"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.city}
                    required
                  >
                    <option value="">{t('selectCityPlaceholder')}</option>
                    <option value="Riyadh">{t('riyadh')}</option>
                    <option value="Jeddah">{t('jeddah')}</option>
                    <option value="Dammam">{t('dammam')}</option>
                    <option value="Abha">{t('abha')}</option>
                    <option value="Al Khobar">{t('alKhobar')}</option>
                    <option value="Madinah">{t('madinah')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Country</label>
                  <input
                    name="country"
                    type="text"
                    placeholder="Country"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.country}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Check-in Time</label>
                  <input
                    name="check_in_time"
                    type="time"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.check_in_time}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Check-out Time</label>
                  <input
                    name="check_out_time"
                    type="time"
                    className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    defaultValue={editingProperty.check_out_time}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Property Picture</label>
                  <div className="flex items-start gap-4 mt-2">
                    {editingProperty.main_picture_url && !editImageFile ? (
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden">
                          <img
                            src={editingProperty.main_picture_url}
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Current Image</span>
                      </div>
                    ) : editImageFile ? (
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(editImageFile)}
                            alt="New Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">New Image</span>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                        <span className="text-sm text-muted-foreground">No Image</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditImageFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {(editingProperty.main_picture_url || editImageFile) && (
                        <button
                          type="button"
                          className="text-destructive hover:text-destructive/80 mt-2"
                          onClick={() => {
                            setEditImageFile(null);
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingProperty(null);
                    setEditImageFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Property</Button>
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
            <Card key={property.id} className="hover:shadow-lg transition-shadow flex flex-col">
              {property.main_picture_url ? (
                <div className="relative w-full h-40 bg-muted overflow-hidden rounded-t-lg">
                  <img
                    src={property.main_picture_url}
                    alt={property.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
              ) : (
                <div className="relative w-full h-40 bg-muted flex items-center justify-center rounded-t-lg">
                  <span className="text-muted-foreground text-sm">No image</span>
                </div>
              )}
              <CardHeader className="pt-4">
                <CardTitle className="text-lg">{property.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 bg-transparent"
                    onClick={() => setEditingProperty(property)}
                  >
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

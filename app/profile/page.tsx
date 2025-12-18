"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/language-context";
import { Camera, User, MapPin, Phone, Mail, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    phone: "",
    address: "",
    city: "",
    country: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user
        const authResponse = await fetch("/api/auth/check");
        if (!authResponse.ok) {
          router.push("/auth/login");
          return;
        }

        const result = await authResponse.json();
        if (!result.user) {
          router.push("/auth/login");
          return;
        }

        setUser(result.user);

        // Get profile data
        let { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", result.user.id)
          .single();

        if (error) {
          // If profile doesn't exist, create one
          if (error.code === 'PGRST116' || error.message.includes('Row not found')) { // Row not found error
            console.log("Profile not found, creating one...");

            // First, get the actual authenticated user from Supabase auth for RLS compliance
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError || !authUser) {
              console.error("Authentication error during profile creation:", authError);
              // Continue with fallback data
              data = {
                full_name: result.user.full_name || result.user.email?.split('@')[0] || 'User',
                bio: "",
                phone: "",
                address: "",
                city: "",
                country: "",
                avatar_url: null,
                is_premium: result.user.is_premium || false
              };
            } else {
              const { error: insertError } = await supabase
                .from("profiles")
                .insert({
                  id: authUser.id, // Use the auth user ID to ensure RLS compliance
                  full_name: result.user.full_name || result.user.email?.split('@')[0] || 'User',
                  is_host: false,
                  is_premium: result.user.is_premium || false
                });

              if (insertError) {
                console.error("Error creating profile:", insertError, insertError.message || insertError);
                // Continue with fallback data
                data = {
                  full_name: result.user.full_name || result.user.email?.split('@')[0] || 'User',
                  bio: "",
                  phone: "",
                  address: "",
                  city: "",
                  country: "",
                  avatar_url: null,
                  is_premium: result.user.is_premium || false
                };
              } else {
                // Fetch the profile again after creation
                const { data: newData, error: newError } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", authUser.id) // Use the auth user ID
                  .single();

                if (newError) {
                  console.error("Error fetching newly created profile:", newError);
                  // Continue with fallback data
                  data = {
                    full_name: result.user.full_name || result.user.email?.split('@')[0] || 'User',
                    bio: "",
                    phone: "",
                    address: "",
                    city: "",
                    country: "",
                    avatar_url: null,
                    is_premium: result.user.is_premium || false
                  };
                } else {
                  data = newData;
                }
              }
            }
          } else {
            console.error("Error fetching profile:", error);
            // Continue with fallback data
            data = {
              full_name: result.user.full_name || result.user.email?.split('@')[0] || 'User',
              bio: "",
              phone: "",
              address: "",
              city: "",
              country: "",
              avatar_url: null,
              is_premium: result.user.is_premium || false
            };
          }
        }

        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          bio: data.bio || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          country: data.country || "",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and handle potential JSON MIME type issue
    let correctedFile = file;
    if (!file.type.startsWith('image/')) {
      // Try to determine the correct MIME type from the file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
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

      const correctedMimeType = mimeTypes[fileExtension || ''] || 'image/jpeg';

      // Create a new file with the correct MIME type
      correctedFile = new File([file], file.name, {
        type: correctedMimeType,
        lastModified: file.lastModified
      });
    }

    // Validate file size (max 5MB) - using corrected file to ensure proper size check
    if (correctedFile.size > 5 * 1024 * 1024) {
      alert(t('imageFileSizeError'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Sanitize the filename by removing special characters and spaces
      const originalName = correctedFile.name;
      const fileExtension = originalName.split('.').pop();
      const sanitizedName = originalName
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

      // Generate a unique filename with the user ID and timestamp
      const fileName = `${user.id}-${Date.now()}-${sanitizedName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('profile')
        .upload(fileName, correctedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Error uploading image:", error);
        // Show more specific error message if it's a filename error
        if (error.message.includes('Invalid key')) {
          alert('Filename contains invalid characters. Please rename your file to use only letters, numbers, dots, and hyphens.');
        } else {
          alert(t('uploadError'));
        }
        return;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile')
        .getPublicUrl(fileName);

      // Update profile via API route (which uses service role)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, avatar_url: publicUrlData.publicUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile with avatar');
      }

      const { profile: updatedProfile } = await response.json();

      // Success updating profile with avatar
      toast.success(t('profileUpdatedSuccessfully'), {
        description: t('profileUpdatedDescription'),
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      });

      // Update local state
      setProfile(updatedProfile);
    } catch (error: any) {
      console.error("Error in image upload:", error);
      toast.error(t('uploadError'), {
        description: error.message || t('uploadError'),
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const { profile: updatedProfile } = await response.json();

      // Success updating profile
      toast.success(t('profileUpdatedSuccessfully'), {
        description: t('profileUpdatedDescription'),
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      });

      // Update local state
      setProfile(updatedProfile);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(t('profileUpdateFailed'), {
        description: error.message || t('profileUpdateError'),
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('loading')}...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t('profile')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Picture Section */}
          <div className="md:col-span-1">
            <Card className="p-6 text-center">
              <div className="relative mx-auto w-32 h-32 rounded-full overflow-hidden mb-4">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, show a placeholder
                      (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold mb-2">{profile?.full_name || user.email}</h2>
              <p className="text-gray-600 mb-4">
                {profile?.is_premium ? t('premiumUser') : t('standardUser')}
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isUploading ? `${t('uploading')}... ${uploadProgress}%` : t('changePicture')}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </Card>
          </div>

          {/* Profile Details Section */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <form onSubmit={handleUpdateProfile}>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="full_name">{t('fullName')}</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder={t('enterFullName')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input id="email" value={user.email} disabled />
                  </div>

                  <div>
                    <Label htmlFor="bio">{t('bio')}</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder={t('enterBio')}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('enterPhone')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">{t('city')}</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder={t('enterCity')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">{t('country')}</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder={t('enterCountry')}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">{t('address')}</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('enterAddress')}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? t('updating') : t('updateProfile')}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
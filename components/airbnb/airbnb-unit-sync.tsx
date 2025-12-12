'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Users,
  Home,
  Bed,
  Bath,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AirbnbApiService from '@/lib/airbnb/airbnb-api';

interface AirbnbListing {
  id: string;
  name: string;
  description: string;
  picture_url: string;
  xl_picture_url: string;
  picture_urls: string[];
  city: string;
  country: string;
  accommodates: number;
  bedrooms: number;
  bathrooms: number;
  amenities: Array<{
    id: number;
    name: string;
  }>;
  price: {
    rate: number;
    currency: string;
  };
  rating_accuracy: number;
  rating_cleanliness: number;
  rating_communication: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
  reviews_count: number;
  host_id: string;
  property_type: string;
  room_type: string;
  lat: number;
  lng: number;
  street: string;
  zipcode: string;
  min_nights: number;
  max_nights: number;
  can_instant_book: boolean;
  is_business_travel_ready: boolean;
}

interface PmsUnit {
  id: string;
  property_id: string;
  name: string;
  floor: number | null;
  price_per_night: number;
  status: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
}

interface AirbnbUnitSyncProps {
  pmsUnits: PmsUnit[];
  pmsProperties: Property[];
  airbnbListings: AirbnbListing[];
  userId: string;
}

export default function AirbnbUnitSync({ pmsUnits, pmsProperties, airbnbListings, userId }: AirbnbUnitSyncProps) {
  const [selectedPmsUnit, setSelectedPmsUnit] = useState<string | null>(null);
  const [selectedAirbnbListing, setSelectedAirbnbListing] = useState<string | null>(null);
  const [syncBidirectional, setSyncBidirectional] = useState(true);
  const [syncPrice, setSyncPrice] = useState(true);
  const [syncAvailability, setSyncAvailability] = useState(true);
  const [syncBookings, setSyncBookings] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async () => {
    if (!selectedPmsUnit || !selectedAirbnbListing) {
      setSyncStatus('error');
      setSyncMessage('Please select both a PMS unit and an Airbnb listing to sync');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      // Find the selected PMS unit and Airbnb listing
      const selectedUnit = pmsUnits.find(unit => unit.id === selectedPmsUnit);
      const selectedListing = airbnbListings.find(listing => listing.id === selectedAirbnbListing);

      if (!selectedUnit || !selectedListing) {
        throw new Error('Selected unit or listing not found');
      }

      const syncOptions = {
        bidirectional: syncBidirectional,
        syncPrice: syncPrice,
        syncAvailability: syncAvailability,
        syncBookings: syncBookings,
      };

      // Call the API to perform the sync
      const response = await fetch('/api/airbnb/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_unit_to_airbnb',
          pmsUnitId: selectedPmsUnit,
          airbnbListingId: selectedAirbnbListing,
          syncOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync request failed');
      }

      setSyncStatus('success');
      setSyncMessage(data.message || 'Sync completed successfully!');
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Sync failed. Please try again.');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewListing = async () => {
    if (!selectedPmsUnit) {
      setSyncStatus('error');
      setSyncMessage('Please select a PMS unit to create an Airbnb listing for');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const selectedUnit = pmsUnits.find(unit => unit.id === selectedPmsUnit);
      if (!selectedUnit) {
        throw new Error('Selected unit not found');
      }

      // Find property for the selected unit
      const property = pmsProperties.find(prop => prop.id === selectedUnit.property_id);
      if (!property) {
        throw new Error('Property for selected unit not found');
      }

      const syncOptions = {
        bidirectional: syncBidirectional,
        syncPrice: syncPrice,
        syncAvailability: syncAvailability,
        syncBookings: syncBookings,
      };

      // Call the API to create a new listing
      const response = await fetch('/api/airbnb/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_unit_to_airbnb',
          pmsUnitId: selectedPmsUnit,
          syncOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Create listing request failed');
      }

      setSyncStatus('success');
      setSyncMessage(data.message || 'New Airbnb listing created successfully!');
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Failed to create new listing. Please try again.');
      console.error('Create listing error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    if (name.includes('wifi') || name.includes('internet')) return <Wifi className="w-4 h-4" />;
    if (name.includes('parking') || name.includes('car')) return <Car className="w-4 h-4" />;
    if (name.includes('kitchen') || name.includes('cook') || name.includes('utensil')) return <Utensils className="w-4 h-4" />;
    if (name.includes('coffee') || name.includes('tea')) return <Coffee className="w-4 h-4" />;
    return <Home className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sync PMS Units with Airbnb</CardTitle>
        <CardDescription>
          Select a PMS unit and an Airbnb listing to sync data between your PMS and Airbnb.
          You can also create new Airbnb listings from your PMS units.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PMS Units Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">PMS Units</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {pmsUnits.map(unit => {
                const property = pmsProperties.find(prop => prop.id === unit.property_id);
                return (
                  <div
                    key={unit.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPmsUnit === unit.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPmsUnit(unit.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{unit.name}</h4>
                        <p className="text-sm text-muted-foreground">{property?.name || 'Unknown Property'}</p>
                        <p className="text-sm font-medium mt-1">${unit.price_per_night}/night</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full ${
                        selectedPmsUnit === unit.id ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                );
              })}

              {pmsUnits.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No units available in your PMS
                </div>
              )}
            </div>
          </div>

          {/* Airbnb Listings Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">Airbnb Listings</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              <div className="space-y-3">
                {airbnbListings.map(listing => (
                  <div
                    key={listing.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAirbnbListing === listing.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedAirbnbListing(listing.id)}
                  >
                    <div className="flex">
                      <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 mr-3">
                        <img
                          src={listing.picture_url || listing.xl_picture_url}
                          alt={listing.name}
                          className="w-full h-full object-cover rounded-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.jpg';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium truncate">{listing.name}</h4>
                          <div className={`w-4 h-4 rounded-full ${
                            selectedAirbnbListing === listing.id ? 'bg-orange-500' : 'bg-gray-300'
                          }`} />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{listing.city}, {listing.country}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="w-3 h-3" />
                            <span>{listing.accommodates} guests</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Bed className="w-3 h-3" />
                            <span>{listing.bedrooms} bed</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Bath className="w-3 h-3" />
                            <span>{listing.bathrooms} bath</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-medium">${listing.price?.rate}/night</span>
                          {listing.rating_accuracy && (
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-sm">★ {listing.rating_accuracy}</span>
                              <span className="text-xs text-muted-foreground">({listing.reviews_count})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {airbnbListings.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No Airbnb listings found
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateNewListing}
                variant="outline"
                className="w-full gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                disabled={isSyncing}
              >
                <Home className="w-4 h-4" />
                Create New Airbnb Listing
              </Button>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Sync Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bidirectional">Bidirectional Sync</Label>
                <Switch
                  id="bidirectional"
                  checked={syncBidirectional}
                  onCheckedChange={setSyncBidirectional}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Sync changes in both directions (PMS ↔ Airbnb)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="price">Sync Prices</Label>
                <Switch
                  id="price"
                  checked={syncPrice}
                  onCheckedChange={setSyncPrice}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Keep pricing consistent between platforms
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="availability">Sync Availability</Label>
                <Switch
                  id="availability"
                  checked={syncAvailability}
                  onCheckedChange={setSyncAvailability}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Prevent double bookings by syncing calendar
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bookings">Sync Bookings</Label>
                <Switch
                  id="bookings"
                  checked={syncBookings}
                  onCheckedChange={setSyncBookings}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Import/export reservations between platforms
              </p>
            </div>
          </div>
        </div>

        {/* Sync Action */}
        <div className="flex flex-col sm:flex-row gap-3 items-center pt-4 border-t">
          <Button
            onClick={handleSync}
            disabled={isSyncing || !selectedPmsUnit || !selectedAirbnbListing}
            className="bg-orange-500 hover:bg-orange-600 min-w-[150px]"
          >
            {isSyncing ? (
              <>
                <Activity className="w-4 h-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              'Sync Selected Items'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleCreateNewListing}
            disabled={isSyncing || !selectedPmsUnit}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            Create New Listing
          </Button>
        </div>

        {/* Status Message */}
        {syncStatus !== 'idle' && (
          <Card className={`mt-4 ${syncStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4 flex items-start gap-2">
              {syncStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${syncStatus === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {syncStatus === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm">
                  {syncMessage}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
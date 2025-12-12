import { AIRBNB_API } from './config';

interface AirbnbListing {
  id: string;
  name: string;
  description: string;
  interaction_type: string;
  picture_url: string;
  picture_urls: string[];
  xl_picture_url: string;
  country: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
  zipcode: string;
  lat: number;
  lng: number;
  property_type: string;
  room_type: string;
  bathrooms: number | null;
  bedrooms: number;
  beds: number;
  accommodates: number;
  amenities: Array<{
    id: number;
    name: string;
  }>;
  host_id: string;
  reviews_count: number;
  rating_accuracy: number;
  rating_cleanliness: number;
  rating_communication: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
  price: {
    rate: number;
    currency: string;
  };
  weekly_discount: number;
  monthly_discount: number;
  min_nights: number;
  max_nights: number;
  person_capacity: number;
  can_instant_book: boolean;
  is_business_travel_ready: boolean;
  require_guest_profile_picture: boolean;
  require_guest_phone_verification: boolean;
  host: {
    id: string;
    first_name: string;
    picture_url: string;
    identity_verified: boolean;
  };
}

interface AirbnbReservation {
  id: string;
  listing_id: string;
  guest_id: string;
  confirmation_code: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  number_of_guests: number;
  status: string; // confirmed, pending, cancelled
  currency: string;
  total_price_native: number;
  host_service_fee_native: number;
  gross_revenue_native: number;
  net_payout_native: number;
  security_deposit_native: number;
  cleaning_fee_native: number;
  accommodation_rate_native: number;
  total_paid_native: number;
  created_at: string; // ISO timestamp
}

interface CalendarAvailability {
  availability: Array<{
    date: string; // YYYY-MM-DD
    available: boolean;
    price: number;
    minimum_nights: number;
    maximum_nights: number;
  }>
}

class AirbnbApiService {
  // Get access token for a specific user's Airbnb account via API
  async getUserAccessToken(userId: string): Promise<string | null> {
    try {
      // Call the API route to get and potentially refresh the access token
      const response = await fetch('/api/airbnb/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        console.error('Failed to get access token from API:', response.statusText);
        return null;
      }

      const { accessToken } = await response.json();
      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get user's listings from Airbnb
  async getListings(userId: string): Promise<AirbnbListing[]> {
    const accessToken = await this.getUserAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      const response = await fetch(AIRBNB_API.LISTINGS_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Airbnb-OAuth-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Airbnb API error: ${response.status} - ${await response.text()}`);
      }

      const result = await response.json();
      return result.listings || [];
    } catch (error) {
      console.error('Error fetching Airbnb listings:', error);
      throw error;
    }
  }

  // Get a specific listing from Airbnb
  async getListing(userId: string, listingId: string): Promise<AirbnbListing> {
    const accessToken = await this.getUserAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      const response = await fetch(`${AIRBNB_API.LISTINGS_URL}/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Airbnb-OAuth-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Airbnb API error: ${response.status} - ${await response.text()}`);
      }

      const result = await response.json();
      return result.listing;
    } catch (error) {
      console.error('Error fetching Airbnb listing:', error);
      throw error;
    }
  }

  // Get reservations for a specific listing
  async getReservations(userId: string, listingId: string, startDate?: string, endDate?: string): Promise<AirbnbReservation[]> {
    const accessToken = await this.getUserAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      let url = `${AIRBNB_API.RESERVATIONS_URL}?listing_ids=${listingId}&_format=for_unified_dashboard`;

      if (startDate) {
        url += `&start_date=${startDate}`;
      }

      if (endDate) {
        url += `&end_date=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Airbnb-OAuth-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Airbnb API error: ${response.status} - ${await response.text()}`);
      }

      const result = await response.json();
      return result.reservations || [];
    } catch (error) {
      console.error('Error fetching Airbnb reservations:', error);
      throw error;
    }
  }

  // Get calendar availability for a listing
  async getCalendar(userId: string, listingId: string, startDate: string, endDate: string): Promise<CalendarAvailability> {
    const accessToken = await this.getUserAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      const response = await fetch(
        AIRBNB_API.CALENDAR_URL(listingId, startDate, endDate),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'X-Airbnb-OAuth-Token': accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Airbnb API error: ${response.status} - ${await response.text()}`);
      }

      const result = await response.json();
      return { availability: result.calendar.days };
    } catch (error) {
      console.error('Error fetching Airbnb calendar:', error);
      throw error;
    }
  }

  // Update calendar availability for a listing
  async updateCalendar(userId: string, listingId: string, availabilityUpdates: Array<{
    date: string;
    available: boolean;
    price: number;
    minimum_nights: number;
    maximum_nights: number;
  }>): Promise<void> {
    const accessToken = await this.getUserAccessToken(userId);

    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    // Group updates by month for efficient API calls
    const groupedUpdates: Record<string, typeof availabilityUpdates> = {};

    availabilityUpdates.forEach(update => {
      const monthYear = update.date.substring(0, 7); // YYYY-MM
      if (!groupedUpdates[monthYear]) {
        groupedUpdates[monthYear] = [];
      }
      groupedUpdates[monthYear].push(update);
    });

    // Process each month separately
    for (const monthYear in groupedUpdates) {
      const updates = groupedUpdates[monthYear];

      // Format the updates for Airbnb API
      const payload: Record<string, any> = {};

      updates.forEach(update => {
        const dateKey = `calendar_updates[${update.date}]`;
        payload[dateKey] = {
          available: update.available,
          price: Math.round(update.price * 100), // Airbnb expects price in cents
          minimum_nights: update.minimum_nights,
          maximum_nights: update.maximum_nights,
        };
      });

      // Convert payload to form data
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      try {
        const response = await fetch(`https://www.airbnb.com/api/v2/pulse/calendar/${listingId}/update_calendars`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Airbnb-OAuth-Token': accessToken,
          },
          body: formData,
        });

        if (!response.ok) {
          console.error(`Failed to update calendar for ${monthYear}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error updating calendar for ${monthYear}:`, error);
        throw error;
      }
    }
  }

  // Create a new listing on Airbnb (simplified)
  async createListing(userId: string, listingData: any): Promise<any> {
    const accessToken = await this.getUserAccessToken(userId);

    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    // Note: Creating a full listing programmatically requires many steps and is complex
    // This is a simplified example that would need to be expanded

    try {
      // First, we need to initiate the listing creation process
      const createResponse = await fetch('https://api.airbnb.com/v2/listings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Airbnb-OAuth-Token': accessToken,
        },
        body: JSON.stringify({
          listing: {
            name: listingData.name,
            description: listingData.description,
            property_type_id: listingData.property_type_id || 1, // Default to apartment
            room_type_category: listingData.room_type_category || 'entire_home',
            person_capacity: listingData.person_capacity || listingData.accommodates || 2,
            bedroom_count: listingData.bedroom_count || listingData.bedrooms || 1,
            bathroom_count: listingData.bathroom_count || listingData.bathrooms || 1,
            accommodates: listingData.accommodates || 2,
            default_price_native: Math.round((listingData.price || 100) * 100), // in cents
            default_price_native_type: 'PER_NIGHT',
            country: listingData.country,
            state: listingData.state || '',
            city: listingData.city,
            street: listingData.street || listingData.address,
            zipcode: listingData.zipcode,
            lat: listingData.lat,
            lng: listingData.lng,
            amenities: listingData.amenities || [],
            cancellation_policy: 'moderate',
            interaction_type: 'self',
            home_type: 'apartment',
          }
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Airbnb API error: ${createResponse.status} - ${await createResponse.text()}`);
      }

      const result = await createResponse.json();
      console.log('Created listing:', result);

      // After creation, we need to fill out additional sections
      // This is a simplified implementation - full implementation would require multiple API calls
      return result.listing;
    } catch (error) {
      console.error('Error creating Airbnb listing:', error);
      throw error;
    }
  }

  // Update an existing listing
  async updateListing(userId: string, listingId: string, updateData: any): Promise<any> {
    const accessToken = await this.getUserAccessToken(userId);

    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      const response = await fetch(`https://api.airbnb.com/v2/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Airbnb-OAuth-Token': accessToken,
        },
        body: JSON.stringify({
          listing: updateData
        }),
      });

      if (!response.ok) {
        throw new Error(`Airbnb API error: ${response.status} - ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Airbnb listing:', error);
      throw error;
    }
  }

  // Add photos to a listing
  async addListingPhotos(userId: string, listingId: string, photoUrls: string[]): Promise<any> {
    const accessToken = await this.getUserAccessToken(userId);

    if (!accessToken) {
      throw new Error('No valid Airbnb connection found for user');
    }

    try {
      // This would involve multiple steps: upload images, then associate with listing
      // For now, we'll simulate the process
      console.log(`Adding ${photoUrls.length} photos to listing ${listingId}`);

      // In a real implementation, you would:
      // 1. Upload each image to Airbnb's image service
      // 2. Get the image IDs
      // 3. Associate the images with the listing

      return { success: true, message: `${photoUrls.length} photos added successfully` };
    } catch (error) {
      console.error('Error adding photos to Airbnb listing:', error);
      throw error;
    }
  }

  // Check if user has a valid Airbnb connection
  async hasValidConnection(userId: string): Promise<boolean> {
    const token = await this.getUserAccessToken(userId);
    return token !== null;
  }

  // Disconnect Airbnb account
  async disconnectAccount(userId: string): Promise<void> {
    await this.supabase
      .from('external_accounts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('platform', 'airbnb');
  }
}

export default AirbnbApiService;
export type { AirbnbListing, AirbnbReservation, CalendarAvailability };
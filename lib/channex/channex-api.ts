import { Database } from '@/lib/supabase/types';

interface ChannexProperty {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface ChannexRoomType {
  id: string;
  property_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ChannexRatePlan {
  id: string;
  room_type_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ChannexChannel {
  id: string;
  property_id: string;
  channel_id: string;
  channel_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannexListing {
  id: string;
  channex_property_id: string;
  external_listing_id: string;
  name: string;
  platform: string;
  is_linked: boolean;
  created_at: string;
  updated_at: string;
}

export class ChannexApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'user-api-key': this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Channex API error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  // Validate the API key by fetching properties
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getProperties();
      return true;
    } catch (error) {
      console.error('Channex API validation failed:', error);
      return false;
    }
  }

  // Get all properties
  async getProperties(): Promise<ChannexProperty[]> {
    const response = await this.makeRequest('/properties');
    return response.data || [];
  }

  // Get room types for a property
  async getRoomTypes(propertyId: string): Promise<ChannexRoomType[]> {
    const response = await this.makeRequest(`/room-types?property_id=${propertyId}`);
    return response.data || [];
  }

  // Get rate plans for a property
  async getRatePlans(propertyId: string): Promise<ChannexRatePlan[]> {
    const response = await this.makeRequest(`/rate-plans?property_id=${propertyId}`);
    return response.data || [];
  }

  // Get channels connected to a property
  async getPropertyChannels(propertyId: string): Promise<ChannexChannel[]> {
    const response = await this.makeRequest(`/property-channels?property_id=${propertyId}`);
    return response.data || [];
  }

  // Get all connected channels for the account
  async getAllChannels(): Promise<ChannexChannel[]> {
    const response = await this.makeRequest('/channels');
    return response.data || [];
  }

  // Push availability/rate updates to Channex
  async pushUpdates(propertyId: string, data: any): Promise<any> {
    // This would typically call Channex ARI endpoints
    const response = await this.makeRequest('/availability_rates_inventory', {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        ...data
      })
    });
    return response;
  }
}
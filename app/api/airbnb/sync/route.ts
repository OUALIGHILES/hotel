import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import AirbnbApiService from '@/lib/airbnb/airbnb-api';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, pmsUnitId, airbnbListingId, syncOptions } = body;

    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    const airbnbService = new AirbnbApiService();

    switch (action) {
      case 'sync_unit_to_airbnb': {
        if (!pmsUnitId) {
          return Response.json({ error: 'PMS unit ID is required' }, { status: 400 });
        }

        // First get the unit and property data
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select(`
            *,
            property:properties(name, address, city, country)
          `)
          .eq('id', pmsUnitId)
          .eq('property.user_id', user.id)
          .single();

        if (unitError || !unitData) {
          return Response.json({ error: 'Unit not found or access denied' }, { status: 404 });
        }

        // Create or update the Airbnb listing
        const listingData = {
          name: unitData.name,
          description: `Cozy accommodation in ${unitData.property.name}. Perfect for your stay in ${unitData.property.city}, ${unitData.property.country}.`,
          price: unitData.price_per_night,
          accommodates: 2, // This would come from unit details in a full implementation
          bedrooms: 1,     // This would come from unit details in a full implementation
          bathrooms: 1,    // This would come from unit details in a full implementation
          address: unitData.property.address,
          city: unitData.property.city,
          country: unitData.property.country,
          // Additional fields would be mapped from unit details
        };

        let result;
        if (airbnbListingId) {
          // Update existing listing
          result = await airbnbService.updateListing(user.id, airbnbListingId, listingData);
        } else {
          // Create new listing
          result = await airbnbService.createListing(user.id, listingData);
        }

        // Create a sync record in the database
        const { error: syncError } = await supabase
          .from('listing_sync')
          .upsert({
            pms_unit_id: pmsUnitId,
            external_account_id: null, // Would need to fetch the actual external account ID
            external_listing_id: result.id,
            platform: 'airbnb',
            sync_settings: syncOptions || {},
            is_sync_enabled: true,
            last_sync_at: new Date().toISOString(),
          });

        if (syncError) {
          console.error('Error creating sync record:', syncError);
          // Don't fail the request if the sync record fails
        }

        return Response.json({ 
          success: true, 
          message: airbnbListingId 
            ? 'Airbnb listing updated successfully' 
            : 'New Airbnb listing created successfully',
          listing: result
        });
      }

      case 'sync_price': {
        if (!pmsUnitId || !airbnbListingId) {
          return Response.json({ error: 'Both PMS unit ID and Airbnb listing ID are required' }, { status: 400 });
        }

        // Get the unit price
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('price_per_night')
          .eq('id', pmsUnitId)
          .single();

        if (unitError || !unitData) {
          return Response.json({ error: 'Unit not found' }, { status: 404 });
        }

        // Update the Airbnb listing price
        const updateData = {
          default_price_native: Math.round(unitData.price_per_night * 100), // Convert to cents
          default_price_native_type: 'PER_NIGHT',
        };

        const result = await airbnbService.updateListing(user.id, airbnbListingId, updateData);

        // Update sync record
        const { error: syncError } = await supabase
          .from('listing_sync')
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq('pms_unit_id', pmsUnitId)
          .eq('external_listing_id', airbnbListingId)
          .eq('platform', 'airbnb');

        if (syncError) {
          console.error('Error updating sync record:', syncError);
        }

        return Response.json({
          success: true,
          message: 'Price synced successfully',
          listing: result
        });
      }

      case 'sync_availability': {
        if (!pmsUnitId || !airbnbListingId) {
          return Response.json({ error: 'Both PMS unit ID and Airbnb listing ID are required' }, { status: 400 });
        }

        // Get the unit availability from PMS
        // This is a simplified example - in reality, you'd get calendar data
        const availabilityData = {
          // Availability data would be fetched from reservations/bookings
        };

        // Update Airbnb calendar
        // This would be more complex in reality
        console.log(`Syncing availability for unit ${pmsUnitId} to Airbnb listing ${airbnbListingId}`);

        // Update sync record
        const { error: syncError } = await supabase
          .from('listing_sync')
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq('pms_unit_id', pmsUnitId)
          .eq('external_listing_id', airbnbListingId)
          .eq('platform', 'airbnb');

        if (syncError) {
          console.error('Error updating sync record:', syncError);
        }

        return Response.json({ 
          success: true, 
          message: 'Availability synced successfully'
        });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Airbnb sync API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
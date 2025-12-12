import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ChannexApiService } from '@/lib/channex/channex-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channexApiKey, userId } = req.body;

  if (!channexApiKey || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create Channex API service instance to validate the API key
    const channexService = new ChannexApiService(channexApiKey);
    const isValid = await channexService.validateApiKey();

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Channex API key' });
    }

    // Store the connection in the database
    const supabase = await createClient();

    // Upsert the connection record
    const { data: connection, error: connectionError } = await supabase
      .from('channex_connections')
      .upsert(
        {
          user_id: userId,
          channex_user_api_key: channexApiKey,
          is_active: true,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (connectionError) {
      console.error('Error saving Channex connection:', connectionError);
      return res.status(500).json({ error: 'Failed to save connection' });
    }

    // Optionally fetch properties to sync immediately
    try {
      const properties = await channexService.getProperties();
      
      // Process properties, room types, rate plans, etc.
      // This is where you would save to your database
      await syncChannexData(userId, properties, channexService);
    } catch (syncError) {
      console.error('Error syncing Channex data:', syncError);
      // Don't fail the connection if sync fails, as it can be retried later
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Channex connected successfully',
      connection: connection 
    });
  } catch (error) {
    console.error('Error connecting to Channex:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function syncChannexData(userId: string, properties: any[], channexService: ChannexApiService) {
  const supabase = await createClient();
  
  // Create a mapping of Channex property IDs to PMS property IDs
  // This will depend on your specific implementation
  
  for (const property of properties) {
    // Sync property
    await supabase.from('channex_properties').upsert({
      channex_property_id: property.id,
      user_id: userId,
      name: property.name,
      currency_code: property.currency_code,
      timezone: property.timezone,
    }, { onConflict: 'channex_property_id' });
    
    // Get room types for this property and sync them
    try {
      const roomTypes = await channexService.getRoomTypes(property.id);
      for (const roomType of roomTypes) {
        await supabase.from('channex_room_types').upsert({
          channex_room_type_id: roomType.id,
          channex_property_id: property.id,
          name: roomType.name,
          description: roomType.description,
        }, { onConflict: 'channex_room_type_id' });
      }
    } catch (error) {
      console.error(`Error syncing room types for property ${property.id}:`, error);
    }
    
    // Get rate plans for this property and sync them
    try {
      const ratePlans = await channexService.getRatePlans(property.id);
      for (const ratePlan of ratePlans) {
        await supabase.from('channex_rate_plans').upsert({
          channex_rate_plan_id: ratePlan.id,
          channex_room_type_id: ratePlan.room_type_id,
          name: ratePlan.name,
          description: ratePlan.description,
        }, { onConflict: 'channex_rate_plan_id' });
      }
    } catch (error) {
      console.error(`Error syncing rate plans for property ${property.id}:`, error);
    }
    
    // Get property channels for this property and sync them
    try {
      const propertyChannels = await channexService.getPropertyChannels(property.id);
      for (const channel of propertyChannels) {
        await supabase.from('channex_property_channels').upsert({
          channex_property_channel_id: channel.id,
          channex_property_id: property.id,
          channel_id: channel.channel_id,
          channel_name: channel.channel_name,
          is_enabled: channel.is_enabled,
        }, { onConflict: 'channex_property_channel_id' });
      }
    } catch (error) {
      console.error(`Error syncing property channels for property ${property.id}:`, error);
    }
  }
  
  // Update the last sync timestamp
  await supabase
    .from('channex_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId);
}
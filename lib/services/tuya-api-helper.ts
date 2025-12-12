import { createTuyaService, TuyaService } from './tuya-service';
import { createClient } from '../supabase/server';

/**
 * Helper functions for Tuya API integration with Supabase
 */

// Get Tuya credentials for a property
export const getPropertyTuyaCredentials = async (propertyId: string) => {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('properties')
    .select('tuya_client_id, tuya_client_secret, tuya_access_token, tuya_refresh_token, tuya_region, tuya_token_expires_at')
    .eq('id', propertyId)
    .single();
  
  if (error) {
    throw new Error(`Error fetching Tuya credentials: ${error.message}`);
  }
  
  return {
    clientId: data.tuya_client_id,
    clientSecret: data.tuya_client_secret,
    accessToken: data.tuya_access_token,
    refreshToken: data.tuya_refresh_token,
    region: data.tuya_region as 'cn' | 'us' | 'eu' | 'in' | 'sg' || 'us',
    tokenExpiresAt: data.tuya_token_expires_at
  };
};

// Update Tuya credentials for a property
export const updatePropertyTuyaCredentials = async (
  propertyId: string,
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    region?: 'cn' | 'us' | 'eu' | 'in' | 'sg';
    tokenExpiresAt?: string;
    connected?: boolean;
  }
) => {
  const supabase = await createClient();
  
  const updateData: any = {};
  
  if (credentials.accessToken !== undefined) updateData.tuya_access_token = credentials.accessToken;
  if (credentials.refreshToken !== undefined) updateData.tuya_refresh_token = credentials.refreshToken;
  if (credentials.clientId !== undefined) updateData.tuya_client_id = credentials.clientId;
  if (credentials.clientSecret !== undefined) updateData.tuya_client_secret = credentials.clientSecret;
  if (credentials.region !== undefined) updateData.tuya_region = credentials.region;
  if (credentials.tokenExpiresAt !== undefined) updateData.tuya_token_expires_at = credentials.tokenExpiresAt;
  if (credentials.connected !== undefined) updateData.tuya_connected = credentials.connected;
  
  const { error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', propertyId);
  
  if (error) {
    throw new Error(`Error updating Tuya credentials: ${error.message}`);
  }
};

// Initialize Tuya service for a property
export const initializeTuyaService = async (propertyId: string): Promise<TuyaService> => {
  const credentials = await getPropertyTuyaCredentials(propertyId);
  
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('Tuya credentials not configured for this property');
  }
  
  // Check if access token exists and is still valid
  const now = new Date();
  const tokenExpiry = credentials.tokenExpiresAt ? new Date(credentials.tokenExpiresAt) : null;
  
  if (!credentials.accessToken || (tokenExpiry && tokenExpiry < now)) {
    // Token expired or doesn't exist, need to get a new one
    const config = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      region: credentials.region
    };
    
    const service = createTuyaService(config);
    const newAccessToken = await service.getAccessToken();
    
    // Calculate expiry time based on the API response (usually 1 hour)
    const expiryDate = new Date(now.getTime() + 3599 * 1000); // 3599 seconds is the usual expiry
    
    // Store the new access token
    await updatePropertyTuyaCredentials(propertyId, {
      accessToken: newAccessToken,
      tokenExpiresAt: expiryDate.toISOString(),
      connected: true
    });
    
    // Return service with new token
    return createTuyaService({
      ...config,
      clientSecret: credentials.clientSecret
    });
  }
  
  // Token is still valid, return service with existing credentials
  return createTuyaService({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    region: credentials.region
  });
};

// Sync Tuya devices with Supabase smart_locks table
export const syncTuyaDevicesWithSupabase = async (propertyId: string) => {
  const service = await initializeTuyaService(propertyId);
  const credentials = await getPropertyTuyaCredentials(propertyId);

  // Get all units associated with this property
  const supabase = await createClient();

  const { data: unitsData, error: unitsError } = await supabase
    .from('units')
    .select('id, name')
    .eq('property_id', propertyId);

  if (unitsError) {
    throw new Error(`Error fetching units: ${unitsError.message}`);
  }

  // Create a mapping of unit names to unit IDs for easier matching
  const unitNameMap: Record<string, string> = {};
  unitsData?.forEach(unit => {
    unitNameMap[unit.name.toLowerCase()] = unit.id;
  });

  // Fetch devices from Tuya - we'll look for devices that are potentially locks
  const allDevices = await service.getDevices(credentials.accessToken || '');

  // Filter for devices that could be smart locks (this is based on device category, name, etc.)
  // Common Tuya categories for locks: 'dl' (door lock), 'cl' (cylinder lock), 'ml' (mortise lock)
  // But we'll include any device and try to match based on naming
  const lockDevices = allDevices.filter(device => {
    // Check if the device category suggests it's a lock or if it has 'lock' in the name
    const isLockCategory = ['dl', 'cl', 'ml', 'wk'].includes(device.category); // wk = water valve?
    const isLockByName = device.name.toLowerCase().includes('lock') ||
                         device.name.toLowerCase().includes('porte') || // door in French
                         device.name.toLowerCase().includes('door');

    return isLockCategory || isLockByName;
  });

  // Process each lock device and update Supabase
  for (const device of lockDevices) {
    // Try to find a corresponding unit based on device name
    let unitId: string | undefined;

    // Look for a unit that matches the device name
    for (const [unitName, unitIdValue] of Object.entries(unitNameMap)) {
      if (device.name.toLowerCase().includes(unitName) ||
          unitName.includes(device.name.toLowerCase()) ||
          device.name.toLowerCase().includes(unitName.replace(/\s+/g, '')) // Case where unit name has spaces
      ) {
        unitId = unitIdValue;
        break;
      }
    }

    // If no matching unit found, we can try other strategies:
    // 1. If unitId is still undefined, look for the first unit
    //    OR skip the device (for now, we'll skip it to avoid incorrect assignments)
    if (!unitId) {
      // Option 1: Skip devices that don't match any unit
      console.log(`Skipping device ${device.name} (${device.id}) - no matching unit found`);
      continue;
    }

    // Check if smart lock already exists based on device_id
    const { data: existingLock, error: lockError } = await supabase
      .from('smart_locks')
      .select('id')
      .eq('device_id', device.id)
      .single();

    if (lockError && lockError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error checking for existing smart lock:', lockError);
      continue; // Skip this device
    }

    // Get current status of the device
    let status = 'unknown';
    let batteryLevel: number | null = null;

    try {
      const deviceStatus = await service.getDeviceStatus(device.id, credentials.accessToken || '');

      // Extract status and battery level if available
      // The status codes may vary by device, so we'll try common ones
      const switchStatus = deviceStatus.find(s =>
        s.code === 'switch' ||
        s.code === 'lock_state' ||
        s.code === 'lock' ||
        s.code === 'open_close' // Some contact sensors use this
      );

      if (switchStatus) {
        // Logic depends on the specific device - some return 'locked'/'unlocked' as strings
        // Others return boolean values or numeric values
        if (typeof switchStatus.value === 'string') {
          status = switchStatus.value.toLowerCase(); // 'locked', 'unlocked', 'open', 'close'
        } else if (typeof switchStatus.value === 'boolean') {
          // Assume: true = locked, false = unlocked (this may vary by device)
          status = switchStatus.value ? 'locked' : 'unlocked';
        } else if (typeof switchStatus.value === 'number') {
          // For numeric values, we might have 0/1 or 1/0 for lock states
          status = switchStatus.value ? 'locked' : 'unlocked';
        } else {
          // Default fallback
          status = 'unknown';
        }
      }

      // Common battery status codes
      const batteryStatus = deviceStatus.find(s =>
        s.code === 'battery_percentage' ||
        s.code === 'electricity' ||
        s.code === 'bat_percent' ||
        s.code === 'battery'
      );

      if (batteryStatus && typeof batteryStatus.value === 'number') {
        batteryLevel = batteryStatus.value;
      } else if (batteryStatus && typeof batteryStatus.value === 'string') {
        const parsedValue = parseInt(batteryStatus.value, 10);
        if (!isNaN(parsedValue)) {
          batteryLevel = parsedValue;
        }
      }
    } catch (statusError: any) {
      console.error(`Error getting status for device ${device.id}:`, statusError?.message || statusError);
    }

    // Prepare update/insert data
    const lockData = {
      unit_id: unitId,
      device_id: device.id,
      name: device.name,
      status: status,
      battery_level: batteryLevel,
      last_activity: new Date().toISOString()
    };

    if (existingLock) {
      // Update existing lock
      const { error: updateError } = await supabase
        .from('smart_locks')
        .update(lockData)
        .eq('id', existingLock.id);

      if (updateError) {
        console.error('Error updating smart lock:', updateError);
      } else {
        console.log(`Updated smart lock: ${device.name} (${device.id}) for unit ${unitId}`);
      }
    } else {
      // Insert new lock
      const { error: insertError } = await supabase
        .from('smart_locks')
        .insert([lockData]);

      if (insertError) {
        console.error('Error inserting smart lock:', insertError);
      } else {
        console.log(`Added new smart lock: ${device.name} (${device.id}) for unit ${unitId}`);
      }
    }
  }

  // After syncing devices from Tuya, we should also remove any locks in Supabase
  // that no longer exist in Tuya (for the given property)
  const { data: allSupabaseLocks, error: supabaseLocksError } = await supabase
    .from('smart_locks')
    .select('id, device_id')
    .in('unit_id', unitsData?.map(unit => unit.id) || []);

  if (supabaseLocksError) {
    console.error('Error fetching existing smart locks:', supabaseLocksError);
  } else {
    // Find locks in Supabase that are not in Tuya response
    const tuyaDeviceIds = new Set(lockDevices.map(device => device.id));
    const locksToRemove = allSupabaseLocks.filter(lock => !tuyaDeviceIds.has(lock.device_id));

    if (locksToRemove.length > 0) {
      // Remove locks that no longer exist in Tuya
      const { error: deleteError } = await supabase
        .from('smart_locks')
        .delete()
        .in('id', locksToRemove.map(lock => lock.id));

      if (deleteError) {
        console.error('Error removing outdated smart locks:', deleteError);
      } else {
        console.log(`Removed ${locksToRemove.length} smart locks that no longer exist in Tuya`);
      }
    }
  }

  return lockDevices;
};
import { NextRequest } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/server';
import { initializeTuyaService, getPropertyTuyaCredentials } from '@/lib/services/tuya-api-helper';

// Helper function to get user from custom auth token
async function getUserFromCustomAuthToken(request: NextRequest) {
  const authCookie = request.cookies.get('auth_token')?.value;
  if (!authCookie) {
    return null;
  }

  try {
    const decodedToken = Buffer.from(authCookie, 'base64').toString('utf-8');
    const user = JSON.parse(decodedToken);
    return user;
  } catch (error) {
    console.error('Error decoding custom auth token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the Supabase client with cookies
    const supabase = await createClientForRoute(request.cookies);

    // Try to get the authenticated user from Supabase first
    let {
      data: { user: supabaseUser },
      error: userError
    } = await supabase.auth.getUser();

    let user = supabaseUser;

    // If Supabase auth failed, try custom auth system
    if (!user) {
      const customUser = await getUserFromCustomAuthToken(request);
      if (customUser) {
        // Create a minimal user object that matches what Supabase returns
        user = {
          id: customUser.id,
          email: customUser.email,
          user_metadata: {
            full_name: customUser.full_name
          }
        };
      }
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, action, propertyId } = body;

    if (!deviceId || !action || !propertyId) {
      return Response.json({ error: 'Device ID, action, and Property ID are required' }, { status: 400 });
    }

    // Check if the user owns the property associated with this smart lock
    const { data: smartLockData, error: smartLockError } = await supabase
      .from('smart_locks')
      .select('id, device_id, units(property_id)')
      .eq('device_id', deviceId)
      .single();

    if (smartLockError || !smartLockData) {
      return Response.json({ error: 'Smart lock not found' }, { status: 404 });
    }

    // Verify that the lock belongs to the specified property
    if (smartLockData.units.property_id !== propertyId) {
      return Response.json({ error: 'Unauthorized to control this device' }, { status: 403 });
    }

    try {
      const service = await initializeTuyaService(propertyId);

      let commandResponse = false;
      let statusMessage = '';

      switch (action) {
        case 'unlock':
          // Try to get device specification first to understand the correct command format
          try {
            const credentials = await getPropertyTuyaCredentials(propertyId);
            const spec = await service.getDeviceSpecification(deviceId, credentials.accessToken || '');
            
            // Look for commands specific to unlocking based on the device specification
            const unlockCommand = findUnlockCommand(spec);
            
            commandResponse = await service.sendCommand(deviceId, unlockCommand, credentials.accessToken || '');
          } catch (specError) {
            // If spec retrieval fails, try with common unlock commands
            console.warn('Could not retrieve device specification, using default command:', specError);
            
            // Common command for unlocking - different devices may use different codes
            const commands = [
              { code: 'switch', value: false }, // Some locks use switch: false to unlock
              { code: 'lock', value: false },   // Some locks use lock: false to unlock
              { code: 'control', value: 'unlock' }, // Some locks use control command
              { code: 'lock_control', value: 'unlock' }, // Some locks use lock_control command
            ];
            
            // Try each command until one works
            for (const cmd of commands) {
              try {
                const credentials = await getPropertyTuyaCredentials(propertyId);
                commandResponse = await service.sendCommand(deviceId, {
                  commands: [cmd]
                }, credentials.accessToken || '');
                
                if (commandResponse) {
                  break; // Successfully executed, exit loop
                }
              } catch (cmdError) {
                console.warn(`Command ${cmd.code} failed, trying next:`, cmdError);
                continue; // Try the next command
              }
            }
          }
          
          statusMessage = 'Successfully unlocked device';
          break;

        case 'lock':
          // Try to get device specification first to understand the correct command format
          try {
            const credentials = await getPropertyTuyaCredentials(propertyId);
            const spec = await service.getDeviceSpecification(deviceId, credentials.accessToken || '');
            
            // Look for commands specific to locking based on the device specification
            const lockCommand = findLockCommand(spec);
            
            commandResponse = await service.sendCommand(deviceId, lockCommand, credentials.accessToken || '');
          } catch (specError) {
            // If spec retrieval fails, try with common lock commands
            console.warn('Could not retrieve device specification, using default command:', specError);
            
            // Common command for locking - different devices may use different codes
            const commands = [
              { code: 'switch', value: true }, // Some locks use switch: true to lock
              { code: 'lock', value: true },   // Some locks use lock: true to lock
              { code: 'control', value: 'lock' }, // Some locks use control command
              { code: 'lock_control', value: 'lock' }, // Some locks use lock_control command
            ];
            
            // Try each command until one works
            for (const cmd of commands) {
              try {
                const credentials = await getPropertyTuyaCredentials(propertyId);
                commandResponse = await service.sendCommand(deviceId, {
                  commands: [cmd]
                }, credentials.accessToken || '');
                
                if (commandResponse) {
                  break; // Successfully executed, exit loop
                }
              } catch (cmdError) {
                console.warn(`Command ${cmd.code} failed, trying next:`, cmdError);
                continue; // Try the next command
              }
            }
          }
          
          statusMessage = 'Successfully locked device';
          break;

        case 'refresh-status':
          // Just update the status in the database
          const credentials = await getPropertyTuyaCredentials(propertyId);
          const deviceStatus = await service.getDeviceStatus(deviceId, credentials.accessToken || '');
          
          // Update the smart lock status in the database
          const lockStatus = determineLockStatus(deviceStatus);
          const batteryLevel = getBatteryLevel(deviceStatus);
          
          const { error: updateError } = await supabase
            .from('smart_locks')
            .update({
              status: lockStatus,
              battery_level: batteryLevel,
              last_activity: new Date().toISOString()
            })
            .eq('device_id', deviceId);
            
          if (updateError) {
            console.error('Error updating lock status:', updateError);
          }
          
          return Response.json({ 
            success: true, 
            status: lockStatus,
            battery_level: batteryLevel,
            message: 'Status refreshed successfully'
          });

        default:
          return Response.json({ error: 'Invalid action' }, { status: 400 });
      }

      if (commandResponse) {
        // Update the lock status in the database after successful command
        // Give a small delay to allow the device to update its status before fetching again
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const credentials = await getPropertyTuyaCredentials(propertyId);
        const deviceStatus = await service.getDeviceStatus(deviceId, credentials.accessToken || '');
        
        const lockStatus = determineLockStatus(deviceStatus);
        const batteryLevel = getBatteryLevel(deviceStatus);
        
        const { error: updateError } = await supabase
          .from('smart_locks')
          .update({
            status: lockStatus,
            battery_level: batteryLevel,
            last_activity: new Date().toISOString()
          })
          .eq('device_id', deviceId);
          
        if (updateError) {
          console.error('Error updating lock status after command:', updateError);
        }
        
        return Response.json({ 
          success: true, 
          status: lockStatus,
          battery_level: batteryLevel,
          message: statusMessage 
        });
      } else {
        return Response.json({ error: 'Failed to execute command' }, { status: 500 });
      }
    } catch (deviceError: any) {
      console.error('Error controlling device:', deviceError);
      return Response.json({ error: `Device control failed: ${deviceError.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/smart-locks/control:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to find the correct unlock command based on device specification
function findUnlockCommand(spec: any) {
  // Look for an unlock-specific command in the device specification
  if (spec.functions) {
    // Look for functions related to unlocking
    const unlockFunction = spec.functions.find((func: any) => 
      func.code && 
      (func.code.includes('lock') || func.code.includes('control')) && 
      func.type === 'Boolean' && 
      func.name && 
      (func.name.toLowerCase().includes('unlock') || func.name.toLowerCase().includes('open'))
    );
    
    if (unlockFunction) {
      return {
        commands: [{
          code: unlockFunction.code,
          value: unlockFunction.defaultValue !== undefined ? unlockFunction.defaultValue : true
        }]
      };
    }
    
    // If no specific unlock function, look for a generic control function
    const controlFunction = spec.functions.find((func: any) => 
      func.code === 'control' || func.code === 'lock_control'
    );
    
    if (controlFunction && controlFunction.values && controlFunction.values.range) {
      // If it's an enum, look for 'unlock' value
      if (controlFunction.values.range.includes('unlock')) {
        return {
          commands: [{
            code: controlFunction.code,
            value: 'unlock'
          }]
        };
      } else if (controlFunction.values.range.includes('open')) {
        return {
          commands: [{
            code: controlFunction.code,
            value: 'open'
          }]
        };
      }
    }
  }
  
  // Default fallback - try common unlock commands
  return {
    commands: [
      { code: 'control', value: 'unlock' }
    ]
  };
}

// Helper function to find the correct lock command based on device specification
function findLockCommand(spec: any) {
  // Look for a lock-specific command in the device specification
  if (spec.functions) {
    // Look for functions related to locking
    const lockFunction = spec.functions.find((func: any) => 
      func.code && 
      (func.code.includes('lock') || func.code.includes('control')) && 
      func.type === 'Boolean' && 
      func.name && 
      (func.name.toLowerCase().includes('lock') || func.name.toLowerCase().includes('close'))
    );
    
    if (lockFunction) {
      return {
        commands: [{
          code: lockFunction.code,
          value: lockFunction.defaultValue !== undefined ? lockFunction.defaultValue : true
        }]
      };
    }
    
    // If no specific lock function, look for a generic control function
    const controlFunction = spec.functions.find((func: any) => 
      func.code === 'control' || func.code === 'lock_control'
    );
    
    if (controlFunction && controlFunction.values && controlFunction.values.range) {
      // If it's an enum, look for 'lock' value
      if (controlFunction.values.range.includes('lock')) {
        return {
          commands: [{
            code: controlFunction.code,
            value: 'lock'
          }]
        };
      } else if (controlFunction.values.range.includes('close')) {
        return {
          commands: [{
            code: controlFunction.code,
            value: 'close'
          }]
        };
      }
    }
  }
  
  // Default fallback - try common lock commands
  return {
    commands: [
      { code: 'control', value: 'lock' }
    ]
  };
}

// Helper function to determine lock status from device status
function determineLockStatus(deviceStatus: any[]): string {
  // This may need adjustment based on the specific device capabilities
  const lockState = deviceStatus.find(status =>
    status.code === 'lock_state' ||
    status.code === 'switch' ||
    status.code === 'door_contact' ||
    status.code === 'lock'
  );

  if (lockState) {
    if (lockState.code === 'lock_state' || lockState.code === 'lock') {
      // Handle both string and boolean values
      if (typeof lockState.value === 'string') {
        return lockState.value.toLowerCase();
      } else if (typeof lockState.value === 'boolean') {
        return lockState.value ? 'locked' : 'unlocked';
      } else if (typeof lockState.value === 'number') {
        return lockState.value ? 'locked' : 'unlocked';
      }
    } else if (lockState.code === 'switch') {
      return lockState.value ? 'locked' : 'unlocked'; // Different devices may have inverted logic
    } else if (lockState.code === 'door_contact') {
      // Door contact sensor: true usually means open, false means closed
      return lockState.value ? 'unlocked' : 'locked';
    }
  }

  return 'unknown';
}

// Helper function to get battery level from device status
function getBatteryLevel(deviceStatus: any[]): number | null {
  const batteryStatus = deviceStatus.find(status =>
    status.code === 'battery_percentage' ||
    status.code === 'electricity' ||
    status.code === 'bat_percent' ||
    status.code === 'battery'
  );

  if (batteryStatus && typeof batteryStatus.value === 'number') {
    return batteryStatus.value;
  } else if (batteryStatus && typeof batteryStatus.value === 'string') {
    const parsedValue = parseInt(batteryStatus.value, 10);
    if (!isNaN(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}
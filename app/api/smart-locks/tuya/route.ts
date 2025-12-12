import { NextRequest } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/server';
import { initializeTuyaService, getPropertyTuyaCredentials, updatePropertyTuyaCredentials, syncTuyaDevicesWithSupabase } from '@/lib/services/tuya-api-helper';

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

export async function GET(request: NextRequest) {
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

    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const action = searchParams.get('action');

    if (!propertyId) {
      return Response.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Check if the user owns this property
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !propertyData) {
      return Response.json({ error: 'Property not found or unauthorized' }, { status: 403 });
    }

    switch (action) {
      case 'get-credentials':
        // Return Tuya credential status for the property
        const credentials = await getPropertyTuyaCredentials(propertyId);
        return Response.json({
          connected: !!credentials.accessToken,
          hasCredentials: !!(credentials.clientId && credentials.clientSecret),
          region: credentials.region
        });

      case 'get-devices':
        try {
          const devices = await syncTuyaDevicesWithSupabase(propertyId);
          return Response.json({ success: true, devices });
        } catch (syncError: any) {
          return Response.json({ success: false, error: syncError.message }, { status: 500 });
        }

      case 'test-connection':
        try {
          const service = await initializeTuyaService(propertyId);
          const credentials = await getPropertyTuyaCredentials(propertyId);
          
          // Try to get a few devices to test the connection
          const devices = await service.getDevices(credentials.accessToken || '', 1, 5);
          return Response.json({ success: true, deviceCount: devices.length });
        } catch (connectionError: any) {
          return Response.json({ success: false, error: connectionError.message }, { status: 500 });
        }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in GET /api/smart-locks/tuya:', error);
    return Response.json({ error: error.message }, { status: 500 });
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
    const { propertyId, action, credentials } = body;

    if (!propertyId) {
      return Response.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Check if the user owns this property
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !propertyData) {
      return Response.json({ error: 'Property not found or unauthorized' }, { status: 403 });
    }

    switch (action) {
      case 'set-credentials':
        if (!credentials || !credentials.clientId || !credentials.clientSecret) {
          return Response.json({ error: 'Client ID and Client Secret are required' }, { status: 400 });
        }
        
        // Validate the provided credentials by attempting to get an access token
        try {
          const service = await initializeTuyaService(propertyId);
          const accessToken = await service.getAccessToken();
          
          await updatePropertyTuyaCredentials(propertyId, {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            region: credentials.region || 'us',
            connected: true
          });
          
          return Response.json({ success: true });
        } catch (validationError: any) {
          return Response.json({ success: false, error: `Invalid credentials: ${validationError.message}` }, { status: 400 });
        }

      case 'disconnect':
        await updatePropertyTuyaCredentials(propertyId, {
          clientId: null,
          clientSecret: null,
          accessToken: null,
          refreshToken: null,
          connected: false
        });
        
        return Response.json({ success: true });

      case 'sync-devices':
        try {
          const devices = await syncTuyaDevicesWithSupabase(propertyId);
          return Response.json({ success: true, devices });
        } catch (syncError: any) {
          return Response.json({ success: false, error: syncError.message }, { status: 500 });
        }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/smart-locks/tuya:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
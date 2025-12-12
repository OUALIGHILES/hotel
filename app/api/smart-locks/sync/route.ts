import { NextRequest } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/server';
import { syncTuyaDevicesWithSupabase } from '@/lib/services/tuya-api-helper';

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
    const { propertyId } = body;

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

    try {
      const devices = await syncTuyaDevicesWithSupabase(propertyId);
      return Response.json({ 
        success: true, 
        deviceCount: devices.length,
        message: `Successfully synced ${devices.length} devices`
      });
    } catch (syncError: any) {
      console.error('Error syncing devices:', syncError);
      return Response.json({ 
        success: false, 
        error: syncError.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/smart-locks/sync:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
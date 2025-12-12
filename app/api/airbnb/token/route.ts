import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIRBNB_API } from '@/lib/airbnb/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { userId } = await request.json();
    
    // Get the current user for verification (optional since userId is passed in)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Verify the user ID matches the authenticated user
    if (user.id !== userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the user's Airbnb access token from database
    const { data, error } = await supabase
      .from('external_accounts')
      .select('id, access_token, token_expires_at, refresh_token')
      .eq('user_id', userId)
      .eq('platform', 'airbnb')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return Response.json({ error: 'No valid Airbnb connection found for user' }, { status: 404 });
    }

    const expiresAt = new Date(data.token_expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      // Token expired, try to refresh
      try {
        const newToken = await refreshToken(data.id, data.refresh_token);
        return Response.json({ accessToken: newToken });
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return Response.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    return Response.json({ accessToken: data.access_token });
  } catch (error) {
    console.error('Error getting access token:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Separate function to refresh the token
async function refreshToken(externalAccountId: string, refreshToken: string) {
  const response = await fetch(AIRBNB_API.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.AIRBNB_CLIENT_ID!,
      client_secret: process.env.AIRBNB_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();

  // Update the token in the database
  const supabase = createClient();
  await supabase
    .from('external_accounts')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })
    .eq('id', externalAccountId);

  return tokenData.access_token;
}
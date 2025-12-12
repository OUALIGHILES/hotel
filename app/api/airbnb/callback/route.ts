import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error(`Airbnb OAuth error: ${error}`, errorDescription);
    return Response.redirect(`${requestUrl.origin}/dashboard/channels?error=airbnb_auth_failed`);
  }

  if (!code) {
    console.error('No authorization code received from Airbnb');
    return Response.redirect(`${requestUrl.origin}/dashboard/channels?error=no_auth_code`);
  }

  try {
    // Exchange the code for tokens using our POST endpoint
    const response = await fetch(`${requestUrl.origin}/api/airbnb/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to exchange code for tokens:', data);
      return Response.redirect(`${requestUrl.origin}/dashboard/channels?error=token_exchange_failed`);
    }

    return Response.redirect(`${requestUrl.origin}/dashboard/channels?success=airbnb_connected`);
  } catch (error) {
    console.error('Error in Airbnb callback:', error);
    return Response.redirect(`${requestUrl.origin}/dashboard/channels?error=internal_error`);
  }
}
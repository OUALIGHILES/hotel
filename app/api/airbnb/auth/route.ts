import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AIRBNB_API } from '@/lib/airbnb/config';

// Airbnb OAuth Configuration
const AIRBNB_CLIENT_ID = process.env.AIRBNB_CLIENT_ID;
const AIRBNB_CLIENT_SECRET = process.env.AIRBNB_CLIENT_SECRET;
const AIRBNB_REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/airbnb/callback`;

// Generate code verifier and challenge for PKCE
function generateCodeVerifier() {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buffer)
    .map(b => String.fromCharCode(b))
    .join('')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64URLEncode(str: Buffer) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer: string) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(buffer));
}

async function generateCodeChallenge(codeVerifier: string) {
  const hashed = await sha256(codeVerifier);
  return base64URLEncode(Buffer.from(hashed));
}

// GET: Initiate Airbnb OAuth flow
export async function GET(request: NextRequest) {
  if (!AIRBNB_CLIENT_ID || !AIRBNB_CLIENT_SECRET) {
    return Response.json({ error: 'Airbnb integration not configured' }, { status: 500 });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier in session cookie for later use
  cookies().set('airbnb_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Redirect to Airbnb OAuth authorization URL
  const authUrl = new URL('https://www.airbnb.com/oauth/v1/authorize');
  authUrl.searchParams.append('client_id', AIRBNB_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', AIRBNB_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('scope', 'calendar_read listings_read reservations_read messaging_read');

  return Response.redirect(authUrl.toString());
}

// POST: Exchange authorization code for access token
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { code } = await request.json();
    const codeVerifier = cookies().get('airbnb_code_verifier')?.value;

    if (!code || !codeVerifier) {
      return Response.json({ error: 'Missing authorization code or verifier' }, { status: 400 });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(AIRBNB_API.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: AIRBNB_CLIENT_ID!,
        client_secret: AIRBNB_CLIENT_SECRET!,
        redirect_uri: AIRBNB_REDIRECT_URI,
        code: code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return Response.json({ error: 'Failed to exchange code for token', details: errorData }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();

    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Save the external account to Supabase
    const { error: insertError } = await supabase
      .from('external_accounts')
      .insert({
        user_id: user.id,
        platform: 'airbnb',
        external_account_id: tokenData.airbnb_user_id || null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        scopes: tokenData.scope?.split(' ') || [],
        connection_metadata: {
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
        },
      });

    if (insertError) {
      console.error('Error saving external account:', insertError);
      return Response.json({ error: 'Failed to save connection' }, { status: 500 });
    }

    // Clear the code verifier cookie
    cookies().delete('airbnb_code_verifier');

    return Response.json({ 
      success: true, 
      message: 'Airbnb account connected successfully',
      expiresAt: tokenData.token_expires_at
    });
  } catch (error) {
    console.error('Error in Airbnb OAuth callback:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
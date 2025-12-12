/**
 * Airbnb Integration Configuration
 * 
 * To use the Airbnb integration, you need to set up the following environment variables:
 * 
 * 1. Register as an Airbnb developer at https://www.airbnb.io/
 * 2. Create a new application in the Airbnb Developer Portal
 * 3. Configure the following environment variables in your .env.local file:
 * 
 * Required environment variables:
 * - AIRBNB_CLIENT_ID: Your Airbnb application client ID
 * - AIRBNB_CLIENT_SECRET: Your Airbnb application client secret
 * - NEXT_PUBLIC_SITE_URL: Your site's URL (e.g., http://localhost:3000 or https://yourdomain.com)
 * 
 * Example .env.local:
 * AIRBNB_CLIENT_ID=your_airbnb_client_id_here
 * AIRBNB_CLIENT_SECRET=your_airbnb_client_secret_here
 * NEXT_PUBLIC_SITE_URL=http://localhost:3000
 */

export const isAirbnbIntegrationConfigured = () => {
  return (
    process.env.AIRBNB_CLIENT_ID &&
    process.env.AIRBNB_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_SITE_URL
  );
};

export const getAirbnbConfig = () => {
  if (!isAirbnbIntegrationConfigured()) {
    throw new Error(
      'Airbnb integration is not properly configured. Please set AIRBNB_CLIENT_ID, AIRBNB_CLIENT_SECRET, and NEXT_PUBLIC_SITE_URL environment variables.'
    );
  }

  return {
    clientId: process.env.AIRBNB_CLIENT_ID!,
    clientSecret: process.env.AIRBNB_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/airbnb/callback`,
  };
};

// Airbnb API endpoints
export const AIRBNB_API = {
  AUTHORIZATION_URL: 'https://www.airbnb.com/oauth/v1/authorize',
  TOKEN_URL: 'https://api.airbnb.com/oauth/v1/access_token',
  LISTINGS_URL: 'https://api.airbnb.com/v2/listings',
  RESERVATIONS_URL: 'https://api.airbnb.com/v2/reservations',
  CALENDAR_URL: (listingId: string, startDate: string, endDate: string) => 
    `https://api.airbnb.com/v2/calendars/${listingId}/${startDate}/${endDate}?_format=v1`,
  USER_URL: 'https://api.airbnb.com/v2/users/me',
};

// Required scopes for Airbnb API access
export const AIRBNB_SCOPES = [
  'calendar_read',
  'listings_read',
  'listings_write',
  'reservations_read',
  'reservations_write',
  'messaging_read',
  'messaging_write',
];
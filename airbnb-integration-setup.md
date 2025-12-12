# Airbnb Integration Setup Guide

This document explains how to set up the Airbnb integration for your PMS dashboard.

## Prerequisites

1. An Airbnb account as a host
2. Access to the [Airbnb Developer Portal](https://www.airbnb.io/)

## Step 1: Register as an Airbnb Developer

1. Go to the [Airbnb Developer Portal](https://www.airbnb.io/)
2. Log in with your Airbnb host account
3. Navigate to "My Apps" and create a new application

## Step 2: Configure Your Application

When creating your application in the Airbnb Developer Portal, you'll need to provide:

- Application name (e.g., "My PMS Dashboard")
- Description
- Redirect URIs:
  - For development: `http://localhost:3000/api/airbnb/callback`
  - For production: `https://yourdomain.com/api/airbnb/callback`

## Step 3: Get Your Credentials

After creating your application, you'll receive:
- Client ID
- Client Secret

## Step 4: Environment Configuration

Create or update your `.env.local` file in the root of your project with the following variables:

```env
# Airbnb Integration
AIRBNB_CLIENT_ID=your_airbnb_client_id_here
AIRBNB_CLIENT_SECRET=your_airbnb_client_secret_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL

# Your Supabase configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 5: Database Migration

Run the database migration to add the necessary tables:

```sql
-- Execute the airbnb-integration-setup.sql file in your Supabase database
-- File location: /airbnb-integration-setup.sql
```

## Step 6: API Scopes

The application requests the following scopes from Airbnb:
- `calendar_read` - Read calendar availability
- `listings_read` - Read listing information
- `listings_write` - Create and update listings
- `reservations_read` - Read reservation data
- `reservations_write` - Create and update reservations
- `messaging_read` - Read messages
- `messaging_write` - Send messages

## Features Implemented

1. **OAuth Authentication**: Secure connection between your PMS and Airbnb account
2. **Listing Management**: View and manage your Airbnb listings in the PMS
3. **Unit Sync**: Sync PMS units to Airbnb listings
4. **Price Sync**: Keep pricing consistent between platforms
5. **Availability Sync**: Prevent double bookings by syncing calendars
6. **Reservation Sync**: Import/export reservations between platforms

## Usage

1. Go to the Channels page in your PMS dashboard
2. Click "Connect Airbnb" to link your Airbnb account
3. Authorize the application when redirected to Airbnb
4. After successful connection, you can:
   - View your existing Airbnb listings
   - Sync existing PMS units to Airbnb
   - Create new Airbnb listings from PMS units

## API Endpoints

The integration includes the following API endpoints:

- `GET/POST /api/airbnb/auth` - Handle OAuth flow
- `GET /api/airbnb/callback` - Handle OAuth callback
- `POST /api/airbnb/disconnect` - Disconnect Airbnb account
- `POST /api/airbnb/sync` - Handle sync operations

## Security Considerations

- Store credentials securely and never commit them to version control
- The application uses PKCE (Proof Key for Code Exchange) for enhanced OAuth security
- Tokens are stored encrypted in the database
- All API calls are validated on the server side

## Troubleshooting

**Issue**: Cannot connect to Airbnb
**Solution**: Verify that your redirect URI in the Airbnb Developer Portal matches your `NEXT_PUBLIC_SITE_URL` environment variable

**Issue**: "Invalid scope" error
**Solution**: Ensure your Airbnb app is approved for the required scopes

**Issue**: Sync operations failing
**Solution**: Check that the user has a valid Airbnb connection and sufficient permissions
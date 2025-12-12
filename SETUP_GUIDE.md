# Complete Welhost PMS Platform Setup Guide

## Overview
This is a complete Property Management System (PMS) built with Next.js, Supabase, and Moyasser payment integration. Users can browse properties, purchase premium plans, and manage their properties through an advanced dashboard.

## User Journey

### 1. **Browse Properties (Home Page)**
- Users visit the homepage and browse available properties in KSA cities
- View listings with images, prices, and ratings
- No account required for browsing

### 2. **Sign Up / Login**
- Create account with email and password
- Supabase handles authentication
- Email confirmation required

### 3. **Packages & Offers**
- After login, users can access "Packages & Offers" from the header
- View two premium plans:
  - **Professional**: 499 SAR/month (up to 5 properties, 20 units, 3 users)
  - **Enterprise**: 1,299 SAR/month (unlimited properties, units, users, API access)
- Click on desired plan to proceed to checkout

### 4. **Checkout & Payment**
- Review selected plan details
- Click "Pay with Moyasser"
- Redirect to Moyasser payment gateway
- Complete payment with card
- Moyasser redirects back to callback endpoint

### 5. **Subscription Activation**
- After successful payment, user is redirected to `/pms/dashboard`
- Subscription marked as "active" in database
- User becomes a "host" (is_host = true)

### 6. **PMS Dashboard Access**
- Full access to Property Management System
- 15+ management features:
  - Dashboard with KPIs and charts
  - Property management
  - Unit/Room management
  - Reservation tracking
  - Guest management
  - Occupancy calendar
  - Messaging system
  - Channel management
  - Smart locks control
  - Task management
  - Invoice generation
  - Financial reports
  - Payment links
  - And more...

## Environment Setup

### Required Environment Variables

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Moyasser Payment Gateway (https://moyasar.com)
MOYASSER_API_KEY=sk_your_api_key
MOYASSER_PUBLISHABLE_KEY=pk_your_publishable_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
\`\`\`

### How to Get Moyasser Keys

1. Go to https://moyasar.com
2. Sign up for a merchant account
3. Create an API key in your dashboard: https://dashboard.moyasar.com/api-keys
4. Copy the Secret Key (starts with `sk_`) → `MOYASSER_API_KEY`
5. Copy the Publishable Key (starts with `pk_`) → `MOYASSER_PUBLISHABLE_KEY`

## Database Schema

### Key Tables

**subscription_plans**
- Plans: Professional (499 SAR) and Enterprise (1,299 SAR)
- Features and billing details

**user_subscriptions**
- Tracks user subscription status
- Links to subscription plans
- Stores Moyasser payment IDs
- Renewal dates

**properties** (host's properties)
- Property details (name, address, city, country)
- Check-in/check-out times
- User ownership

**units** (rooms/apartments)
- Individual units within properties
- Floor, price per night, status
- Linked to properties

**reservations**
- Guest bookings
- Check-in/check-out dates
- Payment status
- Guest information

**guests**
- Guest profiles
- Contact information
- ID verification details

## API Endpoints

### Payment Processing

**POST /api/payment/moyasser**
- Initiates payment with Moyasser
- Creates pending subscription record
- Returns payment URL for redirect
- Request body:
  \`\`\`json
  {
    "planId": "uuid",
    "amount": 499,
    "email": "user@example.com",
    "name": "User Name"
  }
  \`\`\`

**GET /api/payment/callback**
- Moyasser redirects here after payment
- Verifies payment status
- Updates subscription to "active"
- Marks user as host
- Redirects to PMS dashboard

## File Structure

\`\`\`
app/
├── page.tsx                          # Homepage with listings
├── packages/page.tsx                 # Plans & pricing page
├── checkout/page.tsx                 # Payment checkout page
├── api/
│   └── payment/
│       ├── moyasser/route.ts        # Payment initiation
│       └── callback/route.ts        # Payment verification
├── pms/
│   ├── layout.tsx                    # PMS layout wrapper
│   ├── auth-guard.tsx               # Subscription verification
│   └── [various pages]/
│       ├── dashboard/page.tsx        # Main dashboard
│       ├── properties/page.tsx       # Property management
│       ├── units/page.tsx           # Unit management
│       ├── reservations/page.tsx    # Booking management
│       ├── guests/page.tsx          # Guest management
│       └── ...more pages
└── auth/
    ├── login/page.tsx
    ├── sign-up/page.tsx
    └── sign-up-success/page.tsx

scripts/
├── 001_create_tables.sql            # Initial schema
├── 002_extend_pms_schema.sql        # PMS extensions
└── 003_add_subscription_tables.sql  # Subscription system
\`\`\`

## Features

### For Guests
- Browse properties by city in KSA
- View detailed property information
- Make bookings
- Track reservations in dashboard

### For Hosts (Premium Subscribers)
- Manage unlimited properties
- Track units and availability
- Manage reservations and guests
- Generate invoices and receipts
- View occupancy calendars
- Manage communication channels
- Integration with smart locks
- Financial reports and analytics
- Payment processing for guests

### Admin Features
- User and subscription management
- Revenue tracking
- System configuration
- Reports and analytics

## Payment Flow Diagram

\`\`\`
User selects plan
    ↓
Checkout page (review order)
    ↓
Click "Pay with Moyasser"
    ↓
POST /api/payment/moyasser (create pending subscription)
    ↓
Redirect to Moyasser payment gateway
    ↓
User enters card details
    ↓
Moyasser processes payment
    ↓
Redirect to /api/payment/callback
    ↓
Verify payment with Moyasser API
    ↓
If successful:
  - Update subscription status to "active"
  - Mark user as host
  - Redirect to /pms/dashboard
    ↓
If failed:
  - Keep subscription as "pending"
  - Redirect to checkout with error
\`\`\`

## Security Features

- ✅ Row-Level Security (RLS) on all Supabase tables
- ✅ Subscription verification on PMS access
- ✅ User-specific data filtering
- ✅ API key validation with Moyasser
- ✅ Secure payment callback verification
- ✅ HTTP-only session cookies
- ✅ Environment variables for sensitive data

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect GitHub to Vercel
3. Add environment variables in Vercel project settings
4. Deploy with `vercel deploy`

### Set Callback URL

After deployment, update Moyasser callback URL:
1. Go to Moyasser dashboard
2. Settings → Webhooks
3. Add callback URL: `https://your-domain.com/api/payment/callback`

## Testing

### Test Payment Flow

1. Use Moyasser test mode in dashboard
2. Test card: `4111111111111111`
3. Any expiry date (future)
4. Any CVC

### Test Subscription Access

1. Sign up and choose a plan
2. Complete test payment
3. You should be redirected to `/pms/dashboard`
4. Dashboard should show your subscription plan

## Troubleshooting

### Payment not processing
- Check Moyasser API keys in environment variables
- Verify callback URL is correctly set in Moyasser
- Check network tab for API calls

### Can't access PMS dashboard
- Verify subscription is marked as "active"
- Check Supabase subscription tables
- Ensure auth token is valid

### Subscription not showing
- Clear browser cache
- Check user_subscriptions table
- Verify plan_id matches subscription_plans table

## Support

For issues:
1. Check Moyasser documentation: https://moyasar.com/docs
2. Check Supabase docs: https://supabase.com/docs
3. Check Next.js docs: https://nextjs.org/docs

## License

This project is ready for production use.

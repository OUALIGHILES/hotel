import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ChannexApiService } from '@/lib/channex/channex-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, testCase } = req.body;

  if (!userId || !testCase) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabase = await createClient();

    // Get the user's Channex API key from the database
    const { data: connection, error: connectionError } = await supabase
      .from('channex_connections')
      .select('channex_user_api_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Channex connection not found or inactive' });
    }

    const channexService = new ChannexApiService(connection.channex_user_api_key);

    let result;

    switch (testCase) {
      case 'full-sync':
        result = await runFullSyncTest(channexService);
        break;
      case 'single-date-update-single-rate':
        result = await runSingleDateUpdateSingleRateTest(channexService);
        break;
      case 'single-date-update-multiple-rates':
        result = await runSingleDateUpdateMultipleRatesTest(channexService);
        break;
      case 'multiple-date-update-multiple-rates':
        result = await runMultipleDateUpdateMultipleRatesTest(channexService);
        break;
      case 'min-stay-update':
        result = await runMinStayUpdateTest(channexService);
        break;
      case 'stop-sell-update':
        result = await runStopSellUpdateTest(channexService);
        break;
      case 'multiple-restrictions-update':
        result = await runMultipleRestrictionsUpdateTest(channexService);
        break;
      case 'half-year-update':
        result = await runHalfYearUpdateTest(channexService);
        break;
      case 'single-date-availability-update':
        result = await runSingleDateAvailabilityUpdateTest(channexService);
        break;
      case 'multiple-date-availability-update':
        result = await runMultipleDateAvailabilityUpdateTest(channexService);
        break;
      case 'booking-receiving':
        result = await runBookingReceivingTest(channexService);
        break;
      default:
        return res.status(400).json({ error: 'Invalid test case specified' });
    }

    return res.status(200).json({
      success: true,
      testCase,
      result
    });
  } catch (error: any) {
    console.error('Error running Channex test scenario:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Test Case #1: Full Sync
async function runFullSyncTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const roomTypeId = 'c839f7d0-32ca-48ef-8a14-5b125ebb2ea5';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  // 1. Update Availability
  const availabilityResponse = await channexService.pushAvailabilityUpdates({
    values: [{
      property_id: propertyId,
      room_type_id: roomTypeId,
      date_from: '2025-12-20',
      date_to: '2027-05-01',
      availability: 50
    }]
  });

  // 2. Update Prices (Restrictions)
  const restrictionsResponse = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2025-12-20',
      date_to: '2027-05-01',
      rate: 120,
      min_stay_arrival: 1,
      stop_sell: false
    }]
  });

  return {
    availability: availabilityResponse,
    restrictions: restrictionsResponse,
    message: 'Full sync test completed successfully'
  };
}

// Test Case #2: Single Date Update for Single Rate
async function runSingleDateUpdateSingleRateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  const response = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2026-01-01',
      date_to: '2026-01-01',
      rate: 150
    }]
  });

  return {
    response,
    message: 'Single date update for single rate test completed successfully'
  };
}

// Test Case #3: Single Date Update for Multiple Rates
async function runSingleDateUpdateMultipleRatesTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';
  const ratePlanId2 = '948ba9a5-aeb6-4137-8c06-c0fa16584026';

  const response = await channexService.pushRestrictionsUpdates({
    values: [
      {
        property_id: propertyId,
        rate_plan_id: ratePlanId1,
        date_from: '2026-01-02',
        date_to: '2026-01-02',
        rate: 200
      },
      {
        property_id: propertyId,
        rate_plan_id: ratePlanId2,
        date_from: '2026-01-02',
        date_to: '2026-01-02',
        rate: 180
      }
    ]
  });

  return {
    response,
    message: 'Single date update for multiple rates test completed successfully'
  };
}

// Test Case #4: Multiple Date Update for Multiple Rates
async function runMultipleDateUpdateMultipleRatesTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';
  const ratePlanId2 = '948ba9a5-aeb6-4137-8c06-c0fa16584026';

  const response = await channexService.pushRestrictionsUpdates({
    values: [
      {
        property_id: propertyId,
        rate_plan_id: ratePlanId1,
        date_from: '2026-02-01',
        date_to: '2026-02-05',
        rate: 250
      },
      {
        property_id: propertyId,
        rate_plan_id: ratePlanId2,
        date_from: '2026-02-01',
        date_to: '2026-02-05',
        rate: 230
      }
    ]
  });

  return {
    response,
    message: 'Multiple date update for multiple rates test completed successfully'
  };
}

// Test Case #5: Min Stay Update
async function runMinStayUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  const response = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2026-03-01',
      date_to: '2026-03-10',
      min_stay_arrival: 3
    }]
  });

  return {
    response,
    message: 'Min stay update test completed successfully'
  };
}

// Test Case #6: Stop Sell Update
async function runStopSellUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  const response = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2026-04-01',
      date_to: '2026-04-05',
      stop_sell: true
    }]
  });

  return {
    response,
    message: 'Stop sell update test completed successfully'
  };
}

// Test Case #7: Multiple Restrictions Update
async function runMultipleRestrictionsUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  const response = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2026-05-01',
      date_to: '2026-05-05',
      min_stay_arrival: 3,
      closed_to_arrival: true
    }]
  });

  return {
    response,
    message: 'Multiple restrictions update test completed successfully'
  };
}

// Test Case #8: Half-year Update
async function runHalfYearUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  const response = await channexService.pushRestrictionsUpdates({
    values: [{
      property_id: propertyId,
      rate_plan_id: ratePlanId1,
      date_from: '2026-06-01',
      date_to: '2026-12-01',
      rate: 190,
      min_stay_arrival: 2
    }]
  });

  return {
    response,
    message: 'Half-year update test completed successfully'
  };
}

// Test Case #9: Single Date Availability Update
async function runSingleDateAvailabilityUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const roomTypeId = 'c839f7d0-32ca-48ef-8a14-5b125ebb2ea5';

  const response = await channexService.pushAvailabilityUpdates({
    values: [{
      property_id: propertyId,
      room_type_id: roomTypeId,
      date_from: '2026-05-20',
      date_to: '2026-05-20',
      availability: 5
    }]
  });

  return {
    response,
    message: 'Single date availability update test completed successfully'
  };
}

// Test Case #10: Multiple Date Availability Update
async function runMultipleDateAvailabilityUpdateTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const roomTypeId = 'c839f7d0-32ca-48ef-8a14-5b125ebb2ea5';

  const response = await channexService.pushAvailabilityUpdates({
    values: [{
      property_id: propertyId,
      room_type_id: roomTypeId,
      date_from: '2026-07-01',
      date_to: '2026-07-10',
      availability: 20
    }]
  });

  return {
    response,
    message: 'Multiple date availability update test completed successfully'
  };
}

// Test Case #11: Booking Receiving
async function runBookingReceivingTest(channexService: ChannexApiService) {
  const propertyId = '323e10b2-5b35-40a1-886b-a1d91881484a';
  const roomTypeId = 'c839f7d0-32ca-48ef-8a14-5b125ebb2ea5';
  const ratePlanId1 = '654fab20-59d9-4c97-a06f-0f144622488b';

  // 1. Create Booking
  const createBookingResponse = await channexService.createBooking({
    booking: {
      property_id: propertyId,
      ota_reservation_code: 'DOUBLE-TEST-001',
      ota_name: 'Offline',
      arrival_date: '2026-09-01',
      departure_date: '2026-09-02',
      arrival_hour: '14:00',
      currency: 'USD',
      customer: {
        name: 'John',
        surname: 'Doe',
        mail: 'john@doe.com',
        country: 'US',
        phone: '123456789'
      },
      rooms: [
        {
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId1,
          days: {
            '2026-09-01': '120.00'
          },
          occupancy: {
            adults: 2,
            children: 0,
            infants: 0,
            ages: []
          },
          guests: [
            {
              name: 'John',
              surname: 'Doe'
            }
          ]
        }
      ]
    }
  });

  // Extract booking ID for the next operations
  const bookingId = createBookingResponse?.data?.id || createBookingResponse?.id || null;

  if (!bookingId) {
    throw new Error('Failed to create booking - no booking ID returned');
  }

  // 2. Update Booking
  const updateBookingResponse = await channexService.updateBooking(bookingId, {
    booking: {
      status: 'modified',
      property_id: propertyId,
      ota_reservation_code: 'DOUBLE-TEST-001',
      ota_name: 'Offline',
      arrival_date: '2026-09-01',
      departure_date: '2026-09-03',
      rooms: [
        {
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId1,
          days: {
            '2026-09-01': '120.00',
            '2026-09-02': '120.00'
          },
          occupancy: {
            adults: 2,
            children: 0,
            infants: 0,
            ages: []
          }
        }
      ]
    }
  });

  // 3. Cancel Booking
  const cancelBookingResponse = await channexService.cancelBooking(bookingId, {
    booking: {
      status: 'cancelled',
      property_id: propertyId,
      ota_reservation_code: 'DOUBLE-TEST-001',
      ota_name: 'Offline'
    }
  });

  return {
    createBookingResponse,
    updateBookingResponse,
    cancelBookingResponse,
    bookingId,
    message: 'Booking receiving test completed successfully'
  };
}
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Channex signature if needed
    // const signature = req.headers['x-channex-signature'];
    // Verify signature against your stored secret
    
    const eventData = req.body;
    
    console.log('Received Channex webhook:', eventData);
    
    // Process different types of events from Channex
    switch (eventData.event_type) {
      case 'new_reservation':
        await handleNewReservation(eventData);
        break;
      case 'reservation_updated':
        await handleReservationUpdated(eventData);
        break;
      case 'reservation_cancelled':
        await handleReservationCancelled(eventData);
        break;
      case 'rate_changed':
        await handleRateChanged(eventData);
        break;
      case 'availability_changed':
        await handleAvailabilityChanged(eventData);
        break;
      default:
        console.log(`Unknown event type: ${eventData.event_type}`);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Channex webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleNewReservation(data: any) {
  // Handle new reservation from Channex
  console.log('Processing new reservation:', data);
  // Add logic to create reservation in your system
}

async function handleReservationUpdated(data: any) {
  // Handle reservation update from Channex
  console.log('Processing reservation update:', data);
  // Add logic to update reservation in your system
}

async function handleReservationCancelled(data: any) {
  // Handle reservation cancellation from Channex
  console.log('Processing reservation cancellation:', data);
  // Add logic to cancel reservation in your system
}

async function handleRateChanged(data: any) {
  // Handle rate change from Channex
  console.log('Processing rate change:', data);
  // Add logic to update rates in your system
}

async function handleAvailabilityChanged(data: any) {
  // Handle availability change from Channex
  console.log('Processing availability change:', data);
  // Add logic to update availability in your system
}
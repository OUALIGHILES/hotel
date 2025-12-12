import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const supabase = await createClient();

    // Update the connection as inactive instead of deleting
    const { error } = await supabase
      .from('channex_connections')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting Channex:', error);
      return res.status(500).json({ error: 'Failed to disconnect Channex' });
    }

    return res.status(200).json({ success: true, message: 'Channex disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting from Channex:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
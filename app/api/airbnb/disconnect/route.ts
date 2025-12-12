import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update the external account to set is_active to false
    const { error } = await supabase
      .from('external_accounts')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('platform', 'airbnb');

    if (error) {
      console.error('Error disconnecting Airbnb account:', error);
      return Response.json({ error: 'Failed to disconnect Airbnb account' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Airbnb account disconnected successfully' });
  } catch (error) {
    console.error('Error in Airbnb disconnect:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
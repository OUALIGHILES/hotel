// lib/airbnb/utils.ts

import { createClient } from '@/lib/supabase/client';

export interface AirbnbConnectionStatus {
  isConnected: boolean;
  accountName?: string;
  accountId?: string;
  lastSync?: string;
}

export async function getAirbnbConnectionStatus(userId: string): Promise<AirbnbConnectionStatus> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('external_accounts')
    .select('external_account_id, connection_metadata, last_sync_at')
    .eq('user_id', userId)
    .eq('platform', 'airbnb')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { isConnected: false };
  }

  return {
    isConnected: true,
    accountId: data.external_account_id,
    lastSync: data.last_sync_at ? new Date(data.last_sync_at).toLocaleDateString() : undefined
  };
}
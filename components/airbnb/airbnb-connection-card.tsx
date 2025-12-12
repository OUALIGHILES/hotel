'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAirbnbConnectionStatus } from '@/lib/airbnb/utils';
import { 
  Globe, 
  Wifi, 
  WifiOff, 
  MapPin, 
  Users, 
  Star, 
  Home, 
  Plus, 
  Activity, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

interface AirbnbConnectionCardProps {
  userId: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
  onStatusChange: (connected: boolean) => void;
}

export default function AirbnbConnectionCard({ 
  userId, 
  onConnect, 
  onDisconnect, 
  isConnected,
  onStatusChange
}: AirbnbConnectionCardProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [airbnbStatus, setAirbnbStatus] = useState({
    isConnected: false,
    accountName: undefined,
    accountId: undefined,
    lastSync: undefined
  });

  useEffect(() => {
    if (userId) {
      loadConnectionStatus();
    }
  }, [userId]);

  const loadConnectionStatus = async () => {
    const status = await getAirbnbConnectionStatus(userId);
    setAirbnbStatus(status);
    onStatusChange(!!status.isConnected);
  };

  const handleConnect = async () => {
    setLoading(true);
    setStatus('connecting');
    
    try {
      onConnect();
    } catch (error) {
      console.error('Error connecting to Airbnb:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    
    try {
      await onDisconnect();
      setStatus('disconnected');
      setAirbnbStatus({
        isConnected: false,
        accountName: undefined,
        accountId: undefined,
        lastSync: undefined
      });
      onStatusChange(false);
    } catch (error) {
      console.error('Error disconnecting from Airbnb:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-orange-50 relative">
        <div className="absolute top-4 right-4">
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-500" : ""}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Globe className="w-6 h-6 text-orange-600" />
          </div>
          <span>Connect to Airbnb</span>
        </CardTitle>
        <CardDescription>
          {isConnected
            ? "Your Airbnb account is connected. Manage your listings and sync data with your PMS."
            : "Connect your Airbnb account to sync listings, availability, and reservations with your PMS."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <Globe className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium">Airbnb Account Connected</h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {airbnbStatus.accountId || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>

            {airbnbStatus.lastSync && (
              <div className="text-sm text-muted-foreground">
                <p>Last sync: {airbnbStatus.lastSync}</p>
              </div>
            )}

            <div className="pt-4">
              <Button 
                onClick={handleDisconnect} 
                variant="outline" 
                className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Disconnect Account
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="p-2 rounded-full bg-blue-100 mt-0.5">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Connect Your Airbnb Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  By connecting your Airbnb account, you'll be able to sync listings, availability, and reservations with your PMS.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Sync listings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Sync availability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Sync reservations</span>
              </div>
            </div>

            <Button 
              onClick={handleConnect} 
              className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Connect with Airbnb
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Globe, Lock, ExternalLink, Wifi } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ChannexConnectionCardProps {
  userId: string;
  onConnect: (apiKey: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  onStatusChange: (connected: boolean) => void;
}

export default function ChannexConnectionCard({
  userId,
  onConnect,
  onDisconnect,
  isConnected,
  onStatusChange
}: ChannexConnectionCardProps) {
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your Channex API key',
        variant: 'destructive'
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/channex/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channexApiKey: apiKey, userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Channex connected successfully!'
        });
        onStatusChange(true);
        onConnect(apiKey);
      } else {
        throw new Error(data.error || 'Failed to connect to Channex');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect to Channex',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/channex/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Channex disconnected successfully!'
        });
        onStatusChange(false);
        onDisconnect();
      } else {
        throw new Error(data.error || 'Failed to disconnect from Channex');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect from Channex',
        variant: 'destructive'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className={`border-2 ${isConnected ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Channex Connection
                {isConnected && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Connect to Channex for OTA management
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channex-api-key">Channex API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="channex-api-key"
                  type="password"
                  placeholder="Enter your Channex API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You can find your Channex API key in your{' '}
              <a 
                href="https://staging.channex.io/profile" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Channex profile settings
              </a>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
              <Lock className="w-4 h-4 text-green-700" />
              <span className="text-sm text-green-700">Securely connected to Channex</span>
            </div>
            <div className="space-y-2">
              <Label>Connected Channels</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Booking.com</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Airbnb</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Expedia</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {!isConnected ? (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Channex'}
          </Button>
        ) : (
          <Button 
            onClick={handleDisconnect} 
            disabled={isDisconnecting}
            variant="destructive"
            className="w-full"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect from Channex'}
          </Button>
        )}
        <Button variant="outline" className="w-full" asChild>
          <a 
            href="https://www.channex.io/" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Learn more about Channex
            <ExternalLink className="ml-2 w-4 h-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
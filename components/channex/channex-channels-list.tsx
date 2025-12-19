'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Edit, Trash2, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ChannexChannel {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  platform: string;
  is_managed: boolean;
}

interface ChannexChannelsListProps {
  userId: string;
  propertyId?: string;
}

export function ChannexChannelsList({ userId, propertyId }: ChannexChannelsListProps) {
  const [channels, setChannels] = useState<ChannexChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated function to fetch channels from Channex
  useEffect(() => {
    fetchChannexChannels();
  }, [userId, propertyId]);

  const fetchChannexChannels = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would make an API call to get channels from Channex
      // For now, we'll use a mock implementation
      const mockChannels: ChannexChannel[] = [
        {
          id: '1',
          name: 'Booking.com',
          status: 'connected',
          platform: 'ota',
          is_managed: true
        },
        {
          id: '2',
          name: 'Airbnb',
          status: 'connected',
          platform: 'ota',
          is_managed: true
        },
        {
          id: '3',
          name: 'Expedia',
          status: 'connected',
          platform: 'ota',
          is_managed: true
        },
        {
          id: '4',
          name: 'Agoda',
          status: 'connected',
          platform: 'ota',
          is_managed: true
        },
        {
          id: '5',
          name: 'Trip.com',
          status: 'connected',
          platform: 'ota',
          is_managed: true
        },
      ];
      
      setChannels(mockChannels);
    } catch (error) {
      console.error('Error fetching Channex channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChannel = async (channelId: string) => {
    // In a real implementation, this would update the channel via API
    console.log('Updating channel:', channelId);
  };

  const disconnectChannel = async (channelId: string) => {
    // In a real implementation, this would disconnect the channel via API
    console.log('Disconnecting channel:', channelId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <Card key={channel.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {channel.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{channel.platform} Channel</p>
            </div>
            <div className="flex items-center gap-1">
              <Activity className={`w-4 h-4 ${
                channel.status === 'connected' ? 'text-green-500' : 
                channel.status === 'error' ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Managed through Channex
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1 bg-transparent"
                onClick={() => updateChannel(channel.id)}
              >
                <Edit className="w-3 h-3" />
                Manage
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1 bg-transparent"
                onClick={() => disconnectChannel(channel.id)}
              >
                <Trash2 className="w-3 h-3" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
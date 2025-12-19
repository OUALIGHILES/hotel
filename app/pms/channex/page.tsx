'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Wifi,
  Globe,
  Lock,
  ExternalLink,
  Settings,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react';
import ChannexConnectionCard from '@/components/channex/channex-connection-card';
import { ChannexChannelsList } from '@/components/channex/channex-channels-list';
import { TestScenarioCard } from '@/components/channex/test-scenario-card';

// Define test scenario types
type TestScenario = 
  | 'full-sync'
  | 'single-date-update-single-rate'
  | 'single-date-update-multiple-rates'
  | 'multiple-date-update-multiple-rates'
  | 'min-stay-update'
  | 'stop-sell-update'
  | 'multiple-restrictions-update'
  | 'half-year-update'
  | 'single-date-availability-update'
  | 'multiple-date-availability-update'
  | 'booking-receiving';

interface TestResult {
  scenario: TestScenario;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export default function ChannexPage() {
  const [userId, setUserId] = useState<string>('user-123'); // This would come from auth in a real app
  const [isConnected, setIsConnected] = useState(false);
  const [testResults, setTestResults] = useState<Record<TestScenario, TestResult>>({
    'full-sync': { scenario: 'full-sync', status: 'pending' },
    'single-date-update-single-rate': { scenario: 'single-date-update-single-rate', status: 'pending' },
    'single-date-update-multiple-rates': { scenario: 'single-date-update-multiple-rates', status: 'pending' },
    'multiple-date-update-multiple-rates': { scenario: 'multiple-date-update-multiple-rates', status: 'pending' },
    'min-stay-update': { scenario: 'min-stay-update', status: 'pending' },
    'stop-sell-update': { scenario: 'stop-sell-update', status: 'pending' },
    'multiple-restrictions-update': { scenario: 'multiple-restrictions-update', status: 'pending' },
    'half-year-update': { scenario: 'half-year-update', status: 'pending' },
    'single-date-availability-update': { scenario: 'single-date-availability-update', status: 'pending' },
    'multiple-date-availability-update': { scenario: 'multiple-date-availability-update', status: 'pending' },
    'booking-receiving': { scenario: 'booking-receiving', status: 'pending' },
  });
  const [runningTest, setRunningTest] = useState<TestScenario | null>(null);
  const { toast } = useToast();

  // Check connection status on load
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // In a real app, this would check the database for the user's connection status
      // For now, we'll simulate checking the connection status
      const connected = localStorage.getItem('channex_connected') === 'true';
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleConnect = (apiKey: string) => {
    setIsConnected(true);
    localStorage.setItem('channex_connected', 'true');
    toast({
      title: 'Success',
      description: 'Channex connected successfully!'
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    localStorage.removeItem('channex_connected');
    toast({
      title: 'Disconnected',
      description: 'Channex disconnected successfully'
    });
  };

  const runTestScenario = async (scenario: TestScenario) => {
    if (!isConnected) {
      toast({
        title: 'Error',
        description: 'Please connect to Channex first',
        variant: 'destructive'
      });
      return;
    }

    setRunningTest(scenario);
    setTestResults(prev => ({
      ...prev,
      [scenario]: { ...prev[scenario], status: 'running' }
    }));

    try {
      const response = await fetch('/api/channex/test-scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          testCase: scenario
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResults(prev => ({
          ...prev,
          [scenario]: { 
            scenario, 
            status: 'success', 
            message: data.result.message,
            details: data.result
          }
        }));
        
        toast({
          title: 'Test Passed',
          description: `${getTestName(scenario)} completed successfully`
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [scenario]: { 
          scenario, 
          status: 'error', 
          message: error.message || 'Test failed'
        }
      }));
      
      toast({
        title: 'Test Failed',
        description: `${getTestName(scenario)} failed: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setRunningTest(null);
    }
  };


  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Channex Channel Manager</h1>
          <p className="text-muted-foreground">
            Connect and manage your OTA channels through Channex
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Channex Connection
            </CardTitle>
            <CardDescription>
              Connect your Channex account to start managing your OTA channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChannexConnectionCard
              userId={userId}
              isConnected={isConnected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onStatusChange={setIsConnected}
            />
          </CardContent>
        </Card>

        {/* Channel Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Channel Management
            </CardTitle>
            <CardDescription>
              Manage your connected channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Booking.com</span>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Airbnb</span>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Expedia</span>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Channel Stats
            </CardTitle>
            <CardDescription>
              Overview of your channel performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected Channels</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Bookings</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue This Month</span>
                <span className="font-medium">$4,230</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg. Response Time</span>
                <span className="font-medium">0.2s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Channex Certification Tests
          </CardTitle>
          <CardDescription>
            Run the official Channex certification tests to validate your integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testResults).map(([scenario, result]) => (
              <TestScenarioCard
                key={scenario}
                scenario={scenario as TestScenario}
                result={result}
                runningTest={runningTest}
                isConnected={isConnected}
                onRunTest={runTestScenario}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Channels</CardTitle>
          <CardDescription>
            Manage your OTA connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannexChannelsList userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
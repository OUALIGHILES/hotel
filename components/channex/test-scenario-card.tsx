'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle,
  Loader2,
  Calendar,
  Copy,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

interface TestScenarioCardProps {
  scenario: TestScenario;
  result: TestResult;
  runningTest: TestScenario | null;
  isConnected: boolean;
  onRunTest: (scenario: TestScenario) => void;
}

export function TestScenarioCard({ 
  scenario, 
  result, 
  runningTest, 
  isConnected, 
  onRunTest 
}: TestScenarioCardProps) {
  const { toast } = useToast();

  const getTestName = (scenario: TestScenario): string => {
    const names: Record<TestScenario, string> = {
      'full-sync': 'Full Sync Test',
      'single-date-update-single-rate': 'Single Date Update (Single Rate)',
      'single-date-update-multiple-rates': 'Single Date Update (Multiple Rates)',
      'multiple-date-update-multiple-rates': 'Multiple Date Update (Multiple Rates)',
      'min-stay-update': 'Min Stay Update',
      'stop-sell-update': 'Stop Sell Update',
      'multiple-restrictions-update': 'Multiple Restrictions Update',
      'half-year-update': 'Half-year Update',
      'single-date-availability-update': 'Single Date Availability Update',
      'multiple-date-availability-update': 'Multiple Date Availability Update',
      'booking-receiving': 'Booking Receiving Test'
    };
    return names[scenario];
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  const copyResultToClipboard = () => {
    if (result.details) {
      navigator.clipboard.writeText(JSON.stringify(result.details, null, 2));
      toast({
        title: 'Copied to clipboard',
        description: 'Test results copied to clipboard'
      });
    }
  };

  const downloadResult = () => {
    if (result.details) {
      const blob = new Blob([JSON.stringify(result.details, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channex-test-${scenario}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {getTestName(scenario)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon(result.status)}
            <Badge 
              variant={
                result.status === 'success' ? 'default' : 
                result.status === 'error' ? 'destructive' : 
                'secondary'
              }
            >
              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground mb-3">
          {result.message || 'Ready to run test'}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => onRunTest(scenario)}
            disabled={runningTest !== null || !isConnected}
            className="flex-1"
            size="sm"
          >
            {runningTest === scenario ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Test
              </>
            )}
          </Button>
          {result.status === 'success' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={copyResultToClipboard}
                disabled={!result.details}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadResult}
                disabled={!result.details}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Filter } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ReportData {
  month: string;
  occupancy: number;
  revenue: number;
  guests: number;
}

interface SummaryStats {
  avgOccupancy: number;
  totalRevenue: number;
  totalGuests: number;
  avgRating: number;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      // First get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, set empty data
        setReportData([]);
        setSummaryStats({
          avgOccupancy: 0,
          totalRevenue: 0,
          totalGuests: 0,
          avgRating: 0
        });
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get units for the user's properties
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id")
        .in("property_id", propertyIds);

      if (unitsError) {
        console.error("Error fetching units:", unitsError);
        return;
      }

      if (!unitsData || unitsData.length === 0) {
        // If the user has no units, set empty data
        setReportData([]);
        setSummaryStats({
          avgOccupancy: 0,
          totalRevenue: 0,
          totalGuests: 0,
          avgRating: 0
        });
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get reservations for the user's units
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .in("unit_id", unitIds);

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
        return;
      }

      // Calculate summary stats
      if (reservationsData) {
        const totalRevenue = reservationsData.reduce((sum, res) => sum + (Number(res.total_price) || 0), 0);
        const totalGuests = reservationsData.filter(res => res.status === 'checked_in' || res.status === 'confirmed').length;

        // Calculate occupancy based on time ranges (simplified)
        const avgOccupancy = reservationsData.length > 0 ? Math.min(100, Math.round((reservationsData.length / unitsData.length) * 20)) : 0;

        setSummaryStats({
          avgOccupancy,
          totalRevenue,
          totalGuests,
          avgRating: 4.5 // Placeholder - in a real app, would come from reviews
        });

        // Create mock monthly data based on reservations (in a real implementation,
        // you'd use actual date-based aggregation)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIndex = new Date().getMonth();

        // Generate data for the last 4 months
        const monthlyData: ReportData[] = [];
        for (let i = 3; i >= 0; i--) {
          const monthIndex = (currentMonthIndex - i + 12) % 12;
          const month = months[monthIndex];

          // Calculate data for this month based on reservations
          const monthReservations = reservationsData.filter(res => {
            const resDate = new Date(res.check_in_date);
            return resDate.getMonth() === monthIndex;
          });

          const monthRevenue = monthReservations.reduce((sum, res) => sum + (Number(res.total_price) || 0), 0);
          const monthGuests = monthReservations.length;
          const monthOccupancy = monthReservations.length > 0 ? Math.min(100, Math.round((monthReservations.length / unitsData.length) * 25)) : 0;

          monthlyData.push({
            month,
            occupancy: monthOccupancy,
            revenue: monthRevenue,
            guests: monthGuests
          });
        }

        setReportData(monthlyData);
      } else {
        setSummaryStats({
          avgOccupancy: 0,
          totalRevenue: 0,
          totalGuests: 0,
          avgRating: 0
        });
        setReportData([]);
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading reports...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Occupancy Rate</p>
                <p className="text-3xl font-bold mt-2">{summaryStats?.avgOccupancy || 0}%</p>
                <p className="text-xs text-green-600 mt-2">+5% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">${summaryStats?.totalRevenue?.toLocaleString() || 0}</p>
                <p className="text-xs text-green-600 mt-2">+12% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-3xl font-bold mt-2">{summaryStats?.totalGuests || 0}</p>
                <p className="text-xs text-green-600 mt-2">+8% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-3xl font-bold mt-2">{summaryStats?.avgRating || 0}/5</p>
                <p className="text-xs text-green-600 mt-2">+0.2 from last period</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="occupancy" fill="#3b82f6" name="Occupancy %" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

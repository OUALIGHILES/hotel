"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Users, Home, DollarSign, Calendar, Zap } from "lucide-react"

interface Stats {
  totalUnits: number
  newBookings: number
  activeBookings: number
  currentGuests: number
  todayRevenue: number
}

interface SubscriptionInfo {
  plan_name: string
  renewal_date: string
}

export default function DashboardPage() {
  interface UnitStatus {
    id: string;
    name: string;
    status: string;
  }

  const [stats, setStats] = useState<Stats>({
    totalUnits: 0,
    newBookings: 0,
    activeBookings: 0,
    currentGuests: 0,
    todayRevenue: 0,
  })
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [unitStatus, setUnitStatus] = useState<UnitStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get dashboard stats from API
        const statsResponse = await fetch("/api/dashboard/stats");
        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Stats API error: ${statsResponse.status}`);
        }
        const statsResult = await statsResponse.json();
        if (statsResult.error) {
          console.error("Error from stats API:", statsResult.error);
          return;
        }

        // Get chart data from API
        const chartResponse = await fetch("/api/dashboard/charts");
        if (!chartResponse.ok) {
          if (chartResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Charts API error: ${chartResponse.status}`);
        }
        const chartResult = await chartResponse.json();
        if (chartResult.error) {
          console.error("Error from charts API:", chartResult.error);
          return;
        }

        // Get unit status data from API
        const unitsResponse = await fetch("/api/dashboard/units");
        if (!unitsResponse.ok) {
          if (unitsResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Units API error: ${unitsResponse.status}`);
        }
        const unitsResult = await unitsResponse.json();
        if (unitsResult.error) {
          console.error("Error from units API:", unitsResult.error);
          return;
        }

        setStats(statsResult.stats);
        setSubscription(statsResult.subscription);
        setWeeklyData(chartResult.weeklyData);
        setUnitStatus(unitsResult.units);
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const kpiData = [
    { label: "Total Units", value: stats.totalUnits, icon: Home, color: "bg-blue-500" },
    { label: "New Bookings", value: stats.newBookings, icon: Calendar, color: "bg-green-500" },
    { label: "Active Bookings", value: stats.activeBookings, icon: TrendingUp, color: "bg-purple-500" },
    { label: "Current Guests", value: stats.currentGuests, icon: Users, color: "bg-orange-500" },
    {
      label: "Today's Revenue",
      value: `${stats.todayRevenue.toLocaleString()} SAR`,
      icon: DollarSign,
      color: "bg-pink-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {subscription && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Zap className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">{subscription.plan_name} Plan</p>
              <p className="text-xs text-blue-700">
                Renews: {subscription.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-2">{kpi.value}</p>
                  </div>
                  <div className={`${kpi.color} p-3 rounded-lg text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" name="Occupancy %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue (SAR)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Unit Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {unitStatus.map((unit, i) => {
              let statusColor = "text-gray-600";
              if (unit.status === "occupied") statusColor = "text-red-600";
              else if (unit.status === "vacant") statusColor = "text-green-600";
              else if (unit.status === "reserved") statusColor = "text-yellow-600";
              else if (unit.status === "maintenance") statusColor = "text-orange-600";

              return (
                <div key={unit.id} className="p-4 rounded-lg bg-slate-50 border text-center">
                  <p className="font-semibold">{unit.name}</p>
                  <p className={`text-sm mt-2 ${statusColor}`}>
                    {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                  </p>
                </div>
              );
            })}
            {unitStatus.length === 0 && stats.totalUnits > 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading unit status...
              </div>
            )}
            {stats.totalUnits === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No units found. Add properties and units to see status here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

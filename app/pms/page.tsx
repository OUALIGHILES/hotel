"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Property Management System</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/property-settings" className="block">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Property Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage all property-related configurations</p>
              <Button className="mt-4 w-full">Go to Settings</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/properties" className="block">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage your properties</p>
              <Button variant="outline" className="mt-4 w-full">Manage Properties</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/units" className="block">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Units</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage individual units/rooms</p>
              <Button variant="outline" className="mt-4 w-full">Manage Units</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
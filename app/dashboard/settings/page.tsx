"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input type="text" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business Name</label>
              <input type="text" className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors" placeholder="Business name" />
            </div>
            <div className="pt-2">
              <Button className="px-6">Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-sm font-medium text-green-600 dark:text-green-400">
              <p>Active</p>
            </div>
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

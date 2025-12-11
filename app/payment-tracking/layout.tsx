import type React from "react"
import { PMSLayout } from "@/components/pms/pms-layout"
import DashboardAuthGuard from "../dashboard/auth-guard"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <PMSLayout>{children}</PMSLayout>
    </DashboardAuthGuard>
  )
}
import type React from "react"
import { PMSLayout } from "@/components/pms/pms-layout"
import { AuthGuard } from "./auth-guard"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PMSLayout>{children}</PMSLayout>
    </AuthGuard>
  )
}

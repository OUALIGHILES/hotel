"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 mx-auto">
              <Image
                src="/logo_lightmode.png"
                alt="Welhost Logo"
                className="dark:hidden block mx-auto"
                width={64}
                height={64}
              />
              <Image
                src="/logo_darckmode.png"
                alt="Welhost Logo"
                className="hidden dark:block mx-auto"
                width={64}
                height={64}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent you a confirmation link. Click it to verify your email and complete signup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              If you don't see it, check your spam folder. You can close this tab.
            </p>
            <Button asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="pt-4 text-center text-xs text-muted-foreground">
              Property Management System
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

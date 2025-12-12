"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== repeatPassword) {
      setError(t("passwordsDoNotMatch"))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t("registrationFailed"))
        return
      }

      // After registration succeeds, try to sign in with Supabase to ensure session is established
      // This is needed for components that check Supabase auth (like smart locks)
      try {
        const supabase = createSupabaseClient();

        // Try to sign in with email and password to establish Supabase session
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If signInWithPassword fails, it's likely because the user was created via admin API
          // In this case, the custom auth token should still work with our updated API routes
          console.warn("Supabase sign-in failed (user may have been created via admin API):", error.message);
        }
      } catch (supabaseError) {
        console.warn("Supabase session establishment failed:", supabaseError);
        // Don't treat this as a registration failure, since custom auth succeeded
      }

      // Redirect to the success page after successful registration
      router.push("/auth/sign-up-success")
    } catch (err) {
      setError(t("anErrorOccurredPleaseTryAgain"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 mx-auto">
              <Image
                src="/logo_lightmode.png"
                alt="Wellhost Logo"
                className="dark:hidden block mx-auto"
                width={64}
                height={64}
              />
              <Image
                src="/logo_darckmode.png"
                alt="Wellhost Logo"
                className="hidden dark:block mx-auto"
                width={64}
                height={64}
              />
            </div>
            <CardTitle className="text-2xl font-bold">{t("createAnAccount")}</CardTitle>
            <CardDescription>{t("enterYourDetailsToGetStarted")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeatPassword">{t("confirmPassword")}</Label>
                <Input
                  id="repeatPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? t("creatingAccount") : t("createAccount")}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {t("alreadyHaveAnAccount")}{" "}
              <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                {t("signIn")}
              </Link>
            </div>
            <div className="pt-4 text-center text-xs text-muted-foreground">
              {t("propertyManagementSystem")}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

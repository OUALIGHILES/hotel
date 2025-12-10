import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Check for custom auth cookie
  const authToken = request.cookies.get("auth_token")?.value

  // Define protected routes that require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/protected") ||
                           request.nextUrl.pathname.startsWith("/dashboard") ||
                           request.nextUrl.pathname.startsWith("/admin")

  // Define premium routes that require premium status
  const isPremiumRoute = request.nextUrl.pathname.startsWith("/premium") ||
                         request.nextUrl.pathname.startsWith("/api/premium")

  // Redirect to login if trying to access a protected route without authentication
  if (isProtectedRoute && !authToken) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // For premium routes, check if user has premium status
  if (isPremiumRoute && authToken) {
    // Decode the token to get user info
    let user;
    try {
      const decodedToken = Buffer.from(authToken, "base64").toString("utf-8")
      user = JSON.parse(decodedToken)
    } catch (error) {
      console.error("Error decoding token:", error)
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    // If user doesn't have premium status, redirect to packages page
    // Default to false if is_premium is not in the token
    if (!user.is_premium) {
      const url = request.nextUrl.clone()
      url.pathname = "/packages"
      return NextResponse.redirect(url)
    }
  }

  // Redirect away from login if already authenticated and trying to access login page
  if (authToken && request.nextUrl.pathname === "/auth/login") {
    const url = request.nextUrl.clone()
    // Check user premium status to determine redirect destination
    let user;
    try {
      const decodedToken = Buffer.from(authToken, "base64").toString("utf-8")
      user = JSON.parse(decodedToken)
    } catch (error) {
      console.error("Error decoding token for login redirect:", error)
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    // If user has premium status, redirect to dashboard; otherwise to packages
    if (user.is_premium) {
      url.pathname = "/dashboard"
    } else {
      url.pathname = "/packages"
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next({
    request,
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|api|auth|_next).*)"],
}

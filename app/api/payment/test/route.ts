import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are properly loaded
    const apiKey = process.env.MOYASSER_API_KEY;
    const publishableKey = process.env.MOYASSER_PUBLISHABLE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!apiKey) {
      return NextResponse.json({ 
        error: "MOYASSER_API_KEY is not set" 
      }, { status: 500 });
    }

    if (!publishableKey) {
      return NextResponse.json({ 
        error: "MOYASSER_PUBLISHABLE_KEY is not set" 
      }, { status: 500 });
    }

    // Test if keys have the expected format
    if (!apiKey.startsWith('sk_')) {
      return NextResponse.json({ 
        error: "MOYASSER_API_KEY format is invalid (should start with 'sk_')" 
      }, { status: 500 });
    }

    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json({ 
        error: "MOYASSER_PUBLISHABLE_KEY format is invalid (should start with 'pk_')" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Payment environment variables are properly configured",
      hasApiKey: !!apiKey,
      hasPublishableKey: !!publishableKey,
      hasAppUrl: !!appUrl,
      publishableKeyPreview: publishableKey.substring(0, 8) + '...' + publishableKey.slice(-4)
    });
  } catch (error) {
    console.error("Environment test error:", error);
    return NextResponse.json({ 
      error: "Test failed with error: " + (error as Error).message 
    }, { status: 500 });
  }
}
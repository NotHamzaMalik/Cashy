import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';

const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || !process.env.CLERK_SECRET_KEY?.trim()) {
    if (/^\/(api|trpc|__clerk)(\/|$)/.test(request.nextUrl.pathname)) {
      return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    // The root layout displays setup instructions instead of private content.
    return NextResponse.next();
  }
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

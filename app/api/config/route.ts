/**
 * Config API Route
 * Exposes configuration status (never actual values) to the client
 * disablePremium is now per-user from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const SUBSCRIPTION_SOURCES = process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '';

export async function GET() {
    const user = await getAuthUser();
    const disablePremium = user?.disablePremium ?? true;

    return NextResponse.json({
        hasEnvPassword: false, // Auth is now handled by login, no password gate needed
        persistPassword: false,
        subscriptionSources: SUBSCRIPTION_SOURCES,
        disablePremium,
    });
}

export async function POST(request: NextRequest) {
    // Keep for backward compatibility, but no longer used
    try {
        await request.json();
        return NextResponse.json({ valid: true });
    } catch {
        return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
    }
}

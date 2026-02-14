/**
 * Next.js Middleware
 * Protects all routes except login, requiring authentication
 * 
 * NOTE: This file runs in Edge-like middleware runtime.
 * We use jose directly here instead of importing from lib/auth
 * to avoid pulling in better-sqlite3 (Node.js only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
    '/login',
    '/api/auth/login',
];

const COOKIE_NAME = 'kvideo_token';

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET || 'kvideo-default-secret-change-in-production';
    return new TextEncoder().encode(secret);
}

async function verifyJwt(token: string): Promise<{ userId: number; username: string; isAdmin: boolean } | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            userId: payload.userId as number,
            username: payload.username as string,
            isAdmin: payload.isAdmin as boolean,
        };
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Check auth token
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyJwt(token);
    if (!payload) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: '登录已过期' }, { status: 401 });
        }
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete(COOKIE_NAME);
        return response;
    }

    // Admin-only routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (!payload.isAdmin) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: '无权限' }, { status: 403 });
            }
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};

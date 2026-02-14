/**
 * Authentication Module
 * JWT token management and auth helpers for API routes
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserById, type DbUser } from './db';

const COOKIE_NAME = 'kvideo_token';
const TOKEN_EXPIRY = '24h';

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET || 'kvideo-default-secret-change-in-production';
    return new TextEncoder().encode(secret);
}

export interface AuthUser {
    id: number;
    username: string;
    isAdmin: boolean;
    disablePremium: boolean;
}

/**
 * Create a JWT token for a user
 */
export async function createToken(user: DbUser): Promise<string> {
    return new SignJWT({
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(getSecret());
}

/**
 * Verify a JWT token and return the payload
 */
export async function verifyToken(token: string): Promise<{ userId: number; username: string; isAdmin: boolean } | null> {
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

/**
 * Get the authenticated user from the request cookies
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Fetch fresh user data from DB (async now)
    const user = await getUserById(payload.userId);
    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        disablePremium: user.disable_premium === 1,
    };
}

/**
 * Set the auth cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

/**
 * Clear the auth cookie
 */
export async function clearAuthCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };

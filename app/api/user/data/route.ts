/**
 * User Data API Route
 * Per-user data storage (replaces localStorage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserData, setUserData } from '@/lib/db';

const VALID_KEYS = [
    'settings',
    'history',
    'favorites',
    'search-history',
    'premium-history',
    'premium-favorites',
    'search-cache',
    'premium-tags',
];

export async function GET(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const key = request.nextUrl.searchParams.get('key');
    if (!key || !VALID_KEYS.includes(key)) {
        return NextResponse.json({ error: '无效的数据键' }, { status: 400 });
    }

    const data = await getUserData(authUser.id, key);
    return NextResponse.json({ data: JSON.parse(data) });
}

export async function PUT(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    try {
        const { key, value } = await request.json();

        if (!key || !VALID_KEYS.includes(key)) {
            return NextResponse.json({ error: '无效的数据键' }, { status: 400 });
        }

        await setUserData(authUser.id, key, JSON.stringify(value));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }
}

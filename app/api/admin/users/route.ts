/**
 * Admin Users API Route - List and Create Users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAllUsers, createUser, getUserByUsername } from '@/lib/db';

export async function GET() {
    const authUser = await getAuthUser();
    if (!authUser?.isAdmin) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json({
        users: users.map(u => ({
            id: u.id,
            username: u.username,
            isAdmin: u.is_admin === 1,
            disablePremium: u.disable_premium === 1,
            createdAt: u.created_at,
        })),
    });
}

export async function POST(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser?.isAdmin) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    try {
        const { username, password, disablePremium } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 });
        }

        const existing = await getUserByUsername(username);
        if (existing) {
            return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
        }

        const user = await createUser(username, password, disablePremium !== false);
        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin === 1,
                disablePremium: user.disable_premium === 1,
                createdAt: user.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
    }
}

/**
 * Login API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword } from '@/lib/db';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
        }

        const user = await getUserByUsername(username);
        if (!user || !verifyPassword(password, user.password_hash)) {
            return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
        }

        const token = await createToken(user);
        await setAuthCookie(token);

        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin === 1,
                disablePremium: user.disable_premium === 1,
            },
        });
    } catch {
        return NextResponse.json({ error: '登录失败' }, { status: 500 });
    }
}

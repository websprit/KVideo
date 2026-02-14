/**
 * Change Password API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserById, verifyPassword, updateUser } from '@/lib/db';

export async function PUT(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: '请输入当前密码和新密码' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: '新密码至少6个字符' }, { status: 400 });
        }

        const user = await getUserById(authUser.id);
        if (!user || !verifyPassword(currentPassword, user.password_hash)) {
            return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
        }

        await updateUser(authUser.id, { password: newPassword });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
    }
}

/**
 * Admin User CRUD API Route - Update and Delete specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateUser, deleteUser, getUserById, getUserByUsername } from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await getAuthUser();
    if (!authUser?.isAdmin) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
        return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    try {
        const { username, password, disablePremium } = await request.json();

        // Check if target user exists
        const targetUser = await getUserById(userId);
        if (!targetUser) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        // Check username uniqueness if changing
        if (username && username !== targetUser.username) {
            const existing = await getUserByUsername(username);
            if (existing) {
                return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
            }
        }

        const updates: { username?: string; password?: string; disable_premium?: boolean } = {};
        if (username) updates.username = username;
        if (password) updates.password = password;
        if (disablePremium !== undefined) updates.disable_premium = disablePremium;

        await updateUser(userId, updates);

        const updated = await getUserById(userId);
        return NextResponse.json({
            user: {
                id: updated!.id,
                username: updated!.username,
                isAdmin: updated!.is_admin === 1,
                disablePremium: updated!.disable_premium === 1,
                createdAt: updated!.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await getAuthUser();
    if (!authUser?.isAdmin) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
        return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // Cannot delete self
    if (userId === authUser.id) {
        return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    const success = await deleteUser(userId);
    if (!success) {
        return NextResponse.json({ error: '无法删除该用户（可能是管理员）' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserPlus, Trash2, Edit, Save, X, Key, Eye, EyeOff } from 'lucide-react';

interface User {
    id: number;
    username: string;
    isAdmin: boolean;
    disablePremium: boolean;
    createdAt: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create form state
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newDisablePremium, setNewDisablePremium] = useState(true);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Edit form state
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editDisablePremium, setEditDisablePremium] = useState(true);
    const [showEditPassword, setShowEditPassword] = useState(false);

    // Change own password
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [ownNewPassword, setOwnNewPassword] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.status === 403) {
                router.push('/');
                return;
            }
            const data = await res.json();
            setUsers(data.users || []);
        } catch {
            setError('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const showMessage = (msg: string, isError = false) => {
        if (isError) {
            setError(msg);
            setSuccess('');
        } else {
            setSuccess(msg);
            setError('');
        }
        setTimeout(() => { setError(''); setSuccess(''); }, 3000);
    };

    const handleCreate = async () => {
        if (!newUsername || !newPassword) {
            showMessage('用户名和密码不能为空', true);
            return;
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    disablePremium: newDisablePremium,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                showMessage(data.error, true);
                return;
            }

            showMessage(`用户 ${newUsername} 创建成功`);
            setShowCreateForm(false);
            setNewUsername('');
            setNewPassword('');
            setNewDisablePremium(true);
            fetchUsers();
        } catch {
            showMessage('创建用户失败', true);
        }
    };

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setEditUsername(user.username);
        setEditPassword('');
        setEditDisablePremium(user.disablePremium);
    };

    const handleSaveEdit = async (userId: number) => {
        const body: Record<string, unknown> = { disablePremium: editDisablePremium };
        if (editUsername) body.username = editUsername;
        if (editPassword) body.password = editPassword;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) {
                showMessage(data.error, true);
                return;
            }

            showMessage('用户更新成功');
            setEditingId(null);
            fetchUsers();
        } catch {
            showMessage('更新失败', true);
        }
    };

    const handleDelete = async (userId: number, username: string) => {
        if (!confirm(`确定删除用户 "${username}"？此操作将删除该用户的所有数据。`)) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                showMessage(data.error, true);
                return;
            }

            showMessage(`用户 ${username} 已删除`);
            fetchUsers();
        } catch {
            showMessage('删除失败', true);
        }
    };

    const handleChangeOwnPassword = async () => {
        if (!currentPassword || !ownNewPassword) {
            showMessage('请输入当前密码和新密码', true);
            return;
        }

        try {
            const res = await fetch('/api/auth/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword: ownNewPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                showMessage(data.error, true);
                return;
            }

            showMessage('密码修改成功');
            setShowPasswordChange(false);
            setCurrentPassword('');
            setOwnNewPassword('');
        } catch {
            showMessage('修改密码失败', true);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-purple-400" />
                        <h1 className="text-xl font-bold">用户管理</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                        >
                            <Key className="w-4 h-4" />
                            修改密码
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                        >
                            返回首页
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Messages */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
                )}
                {success && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm">{success}</div>
                )}

                {/* Change Own Password */}
                {showPasswordChange && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                        <h3 className="font-semibold text-white/80">修改我的密码</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="password"
                                placeholder="当前密码"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                            />
                            <input
                                type="password"
                                placeholder="新密码（至少6位）"
                                value={ownNewPassword}
                                onChange={(e) => setOwnNewPassword(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleChangeOwnPassword} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors">
                                确认修改
                            </button>
                            <button onClick={() => setShowPasswordChange(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* Create User */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white/80">用户列表</h2>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        新建用户
                    </button>
                </div>

                {showCreateForm && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                        <h3 className="font-semibold text-white/80">创建新用户</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="用户名"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                            />
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="密码（至少6位）"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newDisablePremium}
                                onChange={(e) => setNewDisablePremium(e.target.checked)}
                                className="rounded accent-purple-500"
                            />
                            禁用高级源
                        </label>
                        <div className="flex gap-2">
                            <button onClick={handleCreate} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors">
                                创建
                            </button>
                            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* User Table */}
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 text-white/40 text-sm">
                                <th className="text-left px-4 py-3 font-medium">ID</th>
                                <th className="text-left px-4 py-3 font-medium">用户名</th>
                                <th className="text-left px-4 py-3 font-medium">角色</th>
                                <th className="text-left px-4 py-3 font-medium">高级源</th>
                                <th className="text-right px-4 py-3 font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/3">
                                    {editingId === user.id ? (
                                        <>
                                            <td className="px-4 py-3 text-white/40">{user.id}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={editUsername}
                                                    onChange={(e) => setEditUsername(e.target.value)}
                                                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm w-full focus:outline-none focus:border-purple-500/50"
                                                    disabled={user.isAdmin}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-white/60 text-sm">
                                                {user.isAdmin ? '管理员' : '用户'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setEditDisablePremium(!editDisablePremium)}
                                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${editDisablePremium
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                        }`}
                                                >
                                                    {editDisablePremium ? '已禁用' : '已启用'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <div className="relative">
                                                        <input
                                                            type={showEditPassword ? 'text' : 'password'}
                                                            placeholder="新密码（留空不改）"
                                                            value={editPassword}
                                                            onChange={(e) => setEditPassword(e.target.value)}
                                                            className="px-2 py-1 pr-8 bg-white/5 border border-white/10 rounded text-white text-sm w-36 focus:outline-none focus:border-purple-500/50"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEditPassword(!showEditPassword)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                                        >
                                                            {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSaveEdit(user.id)}
                                                        className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded text-green-400 transition-colors"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white/40 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 text-white/40">{user.id}</td>
                                            <td className="px-4 py-3 font-medium">{user.username}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'
                                                    }`}>
                                                    {user.isAdmin ? '管理员' : '用户'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.disablePremium ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {user.disablePremium ? '已禁用' : '已启用'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {!user.isAdmin && (
                                                        <button
                                                            onClick={() => handleDelete(user.id, user.username)}
                                                            className="p-1.5 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

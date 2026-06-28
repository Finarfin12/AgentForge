'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';
import { useAuthStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Users, Shield, UserCog, Trash2, Calendar, Clock } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const data = await api.users.list();
      setUsers(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.users.update(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      AppAlert.success(`Role updated to ${newRole}`);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDelete(userId: string, username: string) {
    const confirmed = await AppAlert.confirm(`Delete user "${username}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api.users.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      AppAlert.success('User deleted');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-900/30 text-purple-400 border-purple-700',
    user: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  if (loading) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users size={20} className="text-purple-400" /> User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} registered users</p>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500 text-xs uppercase">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Last Login</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white font-medium">
                        {user.username?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.displayName || user.username}</p>
                        <p className="text-xs text-zinc-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-400">{user.email}</td>
                  <td className="p-4">
                    <Badge className={roleColors[user.role] || roleColors.user}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-zinc-500 text-xs">
                    {user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'}
                  </td>
                  <td className="p-4 text-zinc-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-1 justify-end">
                      {user.role !== 'admin' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRoleChange(user.id, 'admin')}
                          title="Promote to admin"
                        >
                          <Shield size={12} />
                        </Button>
                      ) : currentUser?.id !== user.id ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRoleChange(user.id, 'user')}
                          title="Demote to user"
                        >
                          <UserCog size={12} />
                        </Button>
                      ) : null}
                      {currentUser?.id !== user.id && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(user.id, user.username)}
                          title="Delete user"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

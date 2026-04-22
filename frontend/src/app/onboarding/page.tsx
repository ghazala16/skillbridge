'use client';
import { syncUser } from '@/lib/api';
import { ROLE_COLORS, ROLE_DESCRIPTIONS, ROLE_LABELS, getDashboardPath, type Role } from '@/lib/roles';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ROLES: Role[] = ['student', 'trainer', 'institution', 'programme_manager', 'monitoring_officer'];

export default function OnboardingPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!selectedRole || !user) return;
    setLoading(true);
    setError('');

    try {
      // Save role as Clerk public metadata
      // await user.update({ publicMetadata: { role: selectedRole } });

      // Sync to our DB
      const token = await getToken({ template: "default" });
      await syncUser(token!, {
        clerk_user_id: user.id,
        name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'User',
        email: user.emailAddresses[0]?.emailAddress || '',
        role: selectedRole,
      });

      router.push(getDashboardPath(selectedRole));
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">SB</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Welcome to SkillBridge</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Hi {user?.firstName || 'there'}! Select your role to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`card p-4 text-left transition-all border-2 ${
                selectedRole === role
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`badge-role text-xs px-2 py-0.5 rounded-md ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
                {selectedRole === role && (
                  <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {loading ? 'Setting up your account…' : `Continue as ${selectedRole ? ROLE_LABELS[selectedRole] : '…'}`}
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          You can't change your role after this step.
        </p>
      </div>
    </div>
  );
}

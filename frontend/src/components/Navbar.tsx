'use client';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ROLE_LABELS, ROLE_COLORS, getDashboardPath } from '@/lib/roles';

export default function Navbar() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string || '';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href={getDashboardPath(role)} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sky-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">SB</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">SkillBridge</span>
          </Link>

          <div className="flex items-center gap-3">
            {role && (
              <span className={`badge-role text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-700'}`}>
                {ROLE_LABELS[role] || role}
              </span>
            )}
            {user && (
              <span className="text-sm text-slate-600 hidden sm:block">
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}

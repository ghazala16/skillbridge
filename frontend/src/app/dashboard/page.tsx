'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDashboardPath } from '@/lib/roles';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/sign-in'); return; }

    const role = user.publicMetadata?.role as string;
    if (!role) {
      router.push('/onboarding');
    } else {
      router.push(getDashboardPath(role));
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500">Loading your dashboard…</p>
      </div>
    </div>
  );
}

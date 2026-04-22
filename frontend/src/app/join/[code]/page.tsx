'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function JoinBatchPage() {
  const { code } = useParams<{ code: string }>();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function lookupBatch() {
      try {
        const data = await api.getBatchByCode(code);
        if (data.error) { setError(data.error); }
        else { setBatch(data.batch); }
      } catch (e: any) { setError('Invalid invite link.'); }
      finally { setLoading(false); }
    }
    lookupBatch();
  }, [code]);

  const role = user?.publicMetadata?.role as string;

  async function joinBatch() {
    if (!isSignedIn) { router.push(`/sign-in?redirect_url=/join/${code}`); return; }
    if (role !== 'student') { setError('Only students can join batches.'); return; }

    setJoining(true);
    try {
      const token = await getToken();
      await api.joinBatch(token!, batch.id, code);
      setJoined(true);
    } catch (e: any) { setError(e.message); }
    finally { setJoining(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">SB</span>
            </div>
          </div>
          <h1 className="text-xl font-black text-slate-900">Batch Invite</h1>
        </div>

        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error && !batch ? (
            <div className="text-center py-4">
              <p className="text-red-600 font-semibold mb-2">Invalid invite link</p>
              <p className="text-sm text-slate-500">This link may have expired or been revoked.</p>
              <Link href="/" className="btn-secondary mt-4 text-sm inline-flex">Go Home</Link>
            </div>
          ) : joined ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-900 mb-1">You're in!</p>
              <p className="text-sm text-slate-500 mb-4">You've joined <strong>{batch.name}</strong>.</p>
              <Link href="/dashboard/student" className="btn-primary text-sm inline-flex">Go to Dashboard →</Link>
            </div>
          ) : batch ? (
            <div>
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">You're invited to join</p>
                <p className="text-lg font-bold text-slate-900">{batch.name}</p>
                {batch.institution_name && (
                  <p className="text-sm text-slate-500 mt-0.5">{batch.institution_name}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">{batch.student_count} students enrolled</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>
              )}

              {!isSignedIn ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 text-center">Sign in or create an account to join this batch.</p>
                  <Link href={`/sign-up?redirect_url=/join/${code}`} className="btn-primary w-full justify-center">
                    Create Account & Join
                  </Link>
                  <Link href={`/sign-in?redirect_url=/join/${code}`} className="btn-secondary w-full justify-center">
                    Sign In
                  </Link>
                </div>
              ) : role !== 'student' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Only students can join batches. You are signed in as a <strong>{role}</strong>.
                </div>
              ) : (
                <button onClick={joinBatch} disabled={joining} className="btn-primary w-full justify-center py-3">
                  {joining ? 'Joining…' : `Join ${batch.name} →`}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

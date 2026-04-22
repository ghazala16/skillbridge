'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function JoinPage() {
  const [code, setCode] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) router.push(`/join/${trimmed}`);
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
          <h1 className="text-xl font-black text-slate-900">Join a Batch</h1>
          <p className="text-slate-500 text-sm mt-1">Enter the invite code given by your trainer</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Invite Code</label>
              <input
                className="input font-mono text-center text-lg tracking-widest uppercase"
                placeholder="e.g. ABCD1EF2GH"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>
            <button type="submit" disabled={!code.trim()} className="btn-primary w-full justify-center py-3">
              Look Up Batch →
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/dashboard/student" className="text-sm text-slate-500 hover:text-slate-700">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

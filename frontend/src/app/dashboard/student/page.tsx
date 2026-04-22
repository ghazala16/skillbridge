'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';

type Session = {
  id: string; title: string; date: string; start_time: string; end_time: string;
  batch_name: string; trainer_name: string; my_attendance: string | null; marked_at: string | null;
};

export default function StudentDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const token = await getToken();
      const data = await api.getSessions(token!);
      setSessions(data.sessions || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markAttendance(sessionId: string, status: string) {
    setMarking(sessionId);
    setMessage('');
    try {
      const token = await getToken();
      await api.markAttendance(token!, sessionId, status);
      setMessage('Attendance marked!');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setMarking(null); }
  }

  const present = sessions.filter(s => s.my_attendance === 'present').length;
  const late = sessions.filter(s => s.my_attendance === 'late').length;
  const unmarked = sessions.filter(s => !s.my_attendance).length;
  const total = sessions.length;
  const pct = total > 0 ? Math.round(100 * (present + late) / total) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.firstName || 'Student'}</p>
      </div>

      {error && <Alert msg={error} type="error" onClose={() => setError('')} />}
      {message && <Alert msg={message} type="success" onClose={() => setMessage('')} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Attendance Rate" value={`${pct}%`} color="blue" />
        <StatCard label="Present" value={present + late} sub={`${late} late`} color="green" />
        <StatCard label="Absent" value={sessions.filter(s => s.my_attendance === 'absent').length} color="red" />
        <StatCard label="Unmarked" value={unmarked} color="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">My Sessions</h2>
          <Link href="/join" className="btn-secondary text-xs py-1.5 px-3">
            + Join Batch
          </Link>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Join a batch using an invite link from your trainer."
            action={<Link href="/join" className="btn-primary text-sm">Join a Batch</Link>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map(s => (
              <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{s.title}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{s.batch_name}</span>
                      {s.my_attendance && (
                        <span className={`badge-${s.my_attendance}`}>
                          {s.my_attendance}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.start_time}–{s.end_time} · {s.trainer_name}
                    </p>
                    {s.marked_at && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Marked {new Date(s.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(['present', 'late', 'absent'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => markAttendance(s.id, status)}
                        disabled={marking === s.id}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors border ${
                          s.my_attendance === status
                            ? status === 'present' ? 'bg-emerald-500 text-white border-emerald-500'
                            : status === 'late' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function Alert({ msg, type, onClose }: { msg: string; type: 'error' | 'success'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

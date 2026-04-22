'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';

type Session = {
  id: string; title: string; date: string; start_time: string; end_time: string;
  batch_name: string; total_students: number; marked_count: number;
};
type Batch = { id: string; name: string; student_count: number; session_count: number; invite_code: string; };
type AttendanceRow = { student_id: string; student_name: string; email: string; status: string | null; marked_at: string | null; };

export default function TrainerDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sessions' | 'batches'>('sessions');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [viewAttendance, setViewAttendance] = useState<{ session: Session; rows: AttendanceRow[] } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function load() {
    try {
      const token = await getToken();
      const [s, b] = await Promise.all([api.getSessions(token!), api.getBatches(token!)]);
      setSessions(s.sessions || []);
      setBatches(b.batches || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleViewAttendance(session: Session) {
    try {
      const token = await getToken();
      const data = await api.getSessionAttendance(token!, session.id);
      setViewAttendance({ session, rows: data.attendance });
    } catch (e: any) { setError(e.message); }
  }

  async function handleGenerateInvite(batchId: string) {
    try {
      const token = await getToken();
      const data = await api.generateInvite(token!, batchId);
      await load();
      copyToClipboard(data.invite_link, batchId);
    } catch (e: any) { setError(e.message); }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Trainer Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Hi {user?.firstName}, manage your sessions and batches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateBatch(true)} className="btn-secondary text-sm">+ New Batch</button>
          <button onClick={() => setShowCreateSession(true)} className="btn-primary text-sm">+ New Session</button>
        </div>
      </div>

      {error && <ErrBanner msg={error} onClose={() => setError('')} />}

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Sessions" value={sessions.length} color="blue" />
        <StatCard label="Batches" value={batches.length} color="purple" />
        <StatCard label="Total Students" value={batches.reduce((a, b) => a + Number(b.student_count), 0)} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['sessions', 'batches'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="card overflow-hidden">
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet" description="Create your first session to get started."
              action={<button onClick={() => setShowCreateSession(true)} className="btn-primary text-sm">Create Session</button>} />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Session', 'Batch', 'Date', 'Time', 'Attendance', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.title}</td>
                    <td className="px-4 py-3 text-slate-500">{s.batch_name}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 text-slate-500">{s.start_time}–{s.end_time}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-700">
                        {s.marked_count}/{s.total_students}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleViewAttendance(s)} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {batches.length === 0 ? (
            <div className="col-span-2">
              <EmptyState title="No batches yet" description="Create a batch and invite students."
                action={<button onClick={() => setShowCreateBatch(true)} className="btn-primary text-sm">Create Batch</button>} />
            </div>
          ) : batches.map(b => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{b.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{b.student_count} students · {b.session_count} sessions</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono flex-1 truncate">{b.invite_code || 'No code yet'}</code>
                <button onClick={() => handleGenerateInvite(b.id)}
                  className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                  {copied === b.id ? '✓ Copied!' : 'New Link'}
                </button>
                {b.invite_code && (
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/join/${b.invite_code}`, b.id + '_copy')}
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                    {copied === b.id + '_copy' ? '✓ Copied!' : 'Copy Link'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateSession && (
        <CreateSessionModal batches={batches} onClose={() => setShowCreateSession(false)} onCreated={() => { load(); setShowCreateSession(false); }} getToken={getToken} />
      )}
      {showCreateBatch && (
        <CreateBatchModal onClose={() => setShowCreateBatch(false)} onCreated={() => { load(); setShowCreateBatch(false); }} getToken={getToken} />
      )}
      {viewAttendance && (
        <AttendanceModal data={viewAttendance} onClose={() => setViewAttendance(null)} />
      )}
    </div>
  );
}

function CreateSessionModal({ batches, onClose, onCreated, getToken }: any) {
  const [form, setForm] = useState({ batch_id: '', title: '', date: '', start_time: '', end_time: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!form.batch_id || !form.title || !form.date || !form.start_time || !form.end_time) {
      setErr('All fields are required'); return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      await api.createSession(token, form);
      onCreated();
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Create Session" onClose={onClose}>
      <div className="space-y-4">
        {err && <ErrBanner msg={err} onClose={() => setErr('')} />}
        <div>
          <label className="label">Batch</label>
          <select className="input" value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })}>
            <option value="">Select a batch</option>
            {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Session Title</label>
          <input className="input" placeholder="e.g. Introduction to Python" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Start</label>
            <input type="time" className="input" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <label className="label">End</label>
            <input type="time" className="input" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Creating…' : 'Create Session'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateBatchModal({ onClose, onCreated, getToken }: any) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Batch name is required'); return; }
    setLoading(true);
    try {
      const token = await getToken();
      await api.createBatch(token, { name });
      onCreated();
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Create Batch" onClose={onClose}>
      <div className="space-y-4">
        {err && <ErrBanner msg={err} onClose={() => setErr('')} />}
        <div>
          <label className="label">Batch Name</label>
          <input className="input" placeholder="e.g. Batch A — Web Dev 2025" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Creating…' : 'Create Batch'}</button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function AttendanceModal({ data, onClose }: { data: { session: Session; rows: AttendanceRow[] }; onClose: () => void }) {
  return (
    <Modal title={`Attendance: ${data.session.title}`} onClose={onClose} wide>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Student', 'Email', 'Status', 'Marked At'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map(r => (
              <tr key={r.student_id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{r.student_name}</td>
                <td className="px-3 py-2 text-slate-500 text-xs">{r.email}</td>
                <td className="px-3 py-2">
                  {r.status ? <span className={`badge-${r.status}`}>{r.status}</span> : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {r.marked_at ? new Date(r.marked_at).toLocaleString('en-IN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;
}
function ErrBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return <div className="flex items-center justify-between p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200"><span>{msg}</span><button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100">✕</button></div>;
}

'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';

type Batch = { id: string; name: string; student_count: number; session_count: number; institution_name: string; };
type Trainer = { id: string; name: string; email: string; batch_count: number; };
type SummaryStudent = { student_name: string; email: string; total_sessions: number; present: number; late: number; absent: number; attendance_pct: number; };

export default function InstitutionDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'batches' | 'trainers'>('batches');
  const [summary, setSummary] = useState<{ batch: any; students: SummaryStudent[] } | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const token = await getToken();
      const [b, t] = await Promise.all([api.getBatches(token!), api.getTrainers(token!)]);
      setBatches(b.batches || []);
      setTrainers(t.trainers || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function viewSummary(batchId: string) {
    try {
      const token = await getToken();
      const data = await api.getBatchSummary(token!, batchId);
      setSummary(data);
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Institution Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage trainers and batches across your institution</p>
      </div>

      {error && <ErrBanner msg={error} onClose={() => setError('')} />}

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Batches" value={batches.length} color="blue" />
        <StatCard label="Trainers" value={trainers.length} color="purple" />
        <StatCard label="Total Students" value={batches.reduce((a, b) => a + Number(b.student_count), 0)} color="green" />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(['batches', 'trainers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'batches' && (
        <div className="card overflow-hidden">
          {batches.length === 0 ? (
            <EmptyState title="No batches found" description="Batches created by your trainers will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Batch Name', 'Students', 'Sessions', 'Summary'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3 text-slate-500">{b.student_count}</td>
                    <td className="px-4 py-3 text-slate-500">{b.session_count}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewSummary(b.id)} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'trainers' && (
        <div className="card overflow-hidden">
          {trainers.length === 0 ? (
            <EmptyState title="No trainers yet" description="Trainers who join your institution will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Trainer', 'Email', 'Batches'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trainers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t.email}</td>
                    <td className="px-4 py-3 text-slate-500">{t.batch_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {summary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Attendance Summary — {summary.batch?.name}</h2>
              <button onClick={() => setSummary(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="overflow-auto p-5">
              {summary.students.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No students enrolled yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Student', 'Sessions', 'Present', 'Late', 'Absent', 'Rate'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.students.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{s.student_name}</td>
                        <td className="px-3 py-2 text-slate-500">{s.total_sessions}</td>
                        <td className="px-3 py-2"><span className="badge-present">{s.present}</span></td>
                        <td className="px-3 py-2"><span className="badge-late">{s.late}</span></td>
                        <td className="px-3 py-2"><span className="badge-absent">{s.absent}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 w-16">
                              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${s.attendance_pct || 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{s.attendance_pct ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;
}
function ErrBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return <div className="flex items-center justify-between p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200"><span>{msg}</span><button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100">✕</button></div>;
}

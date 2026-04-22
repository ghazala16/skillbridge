'use client';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';

type Institution = { id: string; name: string; batch_count: number; session_count: number; student_count: number; attendance_pct: number; };
type Overall = { total_institutions: number; total_batches: number; total_sessions: number; total_students: number; total_trainers: number; total_present: number; total_late: number; total_absent: number; total_marked: number; };
type InstSummary = { institution: any; batches: any[] };

export default function ProgrammeManagerDashboard() {
  const { getToken } = useAuth();
  const [overall, setOverall] = useState<Overall | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instSummary, setInstSummary] = useState<InstSummary | null>(null);
  const [showCreateInst, setShowCreateInst] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const token = await getToken();
      const data = await api.getProgrammeSummary(token!);
      setOverall(data.overall);
      setInstitutions(data.institutions || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function viewInstSummary(id: string) {
    try {
      const token = await getToken();
      const data = await api.getInstitutionSummary(token!, id);
      setInstSummary(data);
    } catch (e: any) { setError(e.message); }
  }

  async function createInstitution() {
    if (!newInstName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.createInstitution(token!, newInstName);
      setNewInstName('');
      setShowCreateInst(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setCreating(false); }
  }

  const overallPct = overall && Number(overall.total_marked) > 0
    ? Math.round(100 * (Number(overall.total_present) + Number(overall.total_late)) / Number(overall.total_marked))
    : 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Programme Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cross-institution attendance and performance</p>
        </div>
        <button onClick={() => setShowCreateInst(true)} className="btn-primary text-sm">+ New Institution</button>
      </div>

      {error && <ErrBanner msg={error} onClose={() => setError('')} />}

      {overall && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Attendance Rate" value={`${overallPct}%`} color="blue" />
          <StatCard label="Institutions" value={overall.total_institutions} color="purple" />
          <StatCard label="Batches" value={overall.total_batches} color="amber" />
          <StatCard label="Sessions" value={overall.total_sessions} color="blue" />
          <StatCard label="Students" value={overall.total_students} color="green" />
          <StatCard label="Trainers" value={overall.total_trainers} color="purple" />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Institutions</h2>
        </div>
        {institutions.length === 0 ? (
          <EmptyState title="No institutions yet"
            description="Create your first institution to get started."
            action={<button onClick={() => setShowCreateInst(true)} className="btn-primary text-sm">Create Institution</button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Institution', 'Batches', 'Sessions', 'Students', 'Attendance Rate', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inst.name}</td>
                  <td className="px-4 py-3 text-slate-500">{inst.batch_count}</td>
                  <td className="px-4 py-3 text-slate-500">{inst.session_count}</td>
                  <td className="px-4 py-3 text-slate-500">{inst.student_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${inst.attendance_pct || 0}%` }} />
                      </div>
                      <span className="text-xs font-semibold">{inst.attendance_pct ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewInstSummary(inst.id)} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">Drill Down →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateInst && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Create Institution</h2>
            <label className="label">Institution Name</label>
            <input className="input mb-4" placeholder="e.g. Government ITI Bengaluru" value={newInstName} onChange={e => setNewInstName(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={createInstitution} disabled={creating} className="btn-primary flex-1 justify-center">
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowCreateInst(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {instSummary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Institution Drill-Down — {instSummary.institution?.name}</h2>
              <button onClick={() => setInstSummary(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="overflow-auto p-5">
              {instSummary.batches.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No batches in this institution yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Batch', 'Students', 'Sessions', 'Present', 'Late', 'Absent', 'Rate'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {instSummary.batches.map((b: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{b.batch_name}</td>
                        <td className="px-3 py-2 text-slate-500">{b.total_students}</td>
                        <td className="px-3 py-2 text-slate-500">{b.total_sessions}</td>
                        <td className="px-3 py-2"><span className="badge-present">{b.present_count}</span></td>
                        <td className="px-3 py-2"><span className="badge-late">{b.late_count}</span></td>
                        <td className="px-3 py-2"><span className="badge-absent">{b.absent_count}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-200 rounded-full h-1.5">
                              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${b.attendance_pct || 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold">{b.attendance_pct ?? 0}%</span>
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

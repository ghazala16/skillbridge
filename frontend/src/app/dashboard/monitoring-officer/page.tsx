'use client';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';

type Institution = { id: string; name: string; batch_count: number; session_count: number; student_count: number; attendance_pct: number; };
type Overall = { total_institutions: number; total_batches: number; total_sessions: number; total_students: number; total_trainers: number; total_present: number; total_late: number; total_absent: number; total_marked: number; };

export default function MonitoringOfficerDashboard() {
  const { getToken } = useAuth();
  const [overall, setOverall] = useState<Overall | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const data = await api.getProgrammeSummary(token!);
        setOverall(data.overall);
        setInstitutions(data.institutions || []);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const overallPct = overall && Number(overall.total_marked) > 0
    ? Math.round(100 * (Number(overall.total_present) + Number(overall.total_late)) / Number(overall.total_marked))
    : 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Programme Monitor</h1>
          <p className="text-slate-500 text-sm mt-0.5">Read-only programme-wide attendance overview</p>
        </div>
        {/* NO create/edit/delete buttons — monitoring officer is read-only */}
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
          <span className="text-xs font-semibold text-rose-700">Read-only access</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {overall && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Overall Rate" value={`${overallPct}%`} color="blue" />
          <StatCard label="Institutions" value={overall.total_institutions} color="purple" />
          <StatCard label="Batches" value={overall.total_batches} color="amber" />
          <StatCard label="Sessions" value={overall.total_sessions} color="blue" />
          <StatCard label="Students" value={overall.total_students} color="green" />
          <StatCard label="Trainers" value={overall.total_trainers} color="purple" />
        </div>
      )}

      {overall && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5 border-emerald-200 bg-emerald-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Present</p>
            <p className="text-3xl font-black text-emerald-700">{overall.total_present}</p>
            <p className="text-xs text-emerald-600 mt-1">attendance records</p>
          </div>
          <div className="card p-5 border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Late</p>
            <p className="text-3xl font-black text-amber-700">{overall.total_late}</p>
            <p className="text-xs text-amber-600 mt-1">attendance records</p>
          </div>
          <div className="card p-5 border-red-200 bg-red-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Absent</p>
            <p className="text-3xl font-black text-red-700">{overall.total_absent}</p>
            <p className="text-xs text-red-600 mt-1">attendance records</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Institutions Performance</h2>
        </div>
        {institutions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No data available yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Institution', 'Batches', 'Sessions', 'Students', 'Attendance Rate'].map(h => (
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
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (inst.attendance_pct || 0) >= 75 ? 'bg-emerald-500'
                            : (inst.attendance_pct || 0) >= 50 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }`}
                          style={{ width: `${inst.attendance_pct || 0}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${
                        (inst.attendance_pct || 0) >= 75 ? 'text-emerald-700'
                        : (inst.attendance_pct || 0) >= 50 ? 'text-amber-700'
                        : 'text-red-700'
                      }`}>
                        {inst.attendance_pct ?? 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;
}

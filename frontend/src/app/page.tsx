import Link from 'next/link';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '@/lib/roles';

export default function HomePage() {
  const roles = ['student', 'trainer', 'institution', 'programme_manager', 'monitoring_officer'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">SB</span>
            </div>
            <span className="text-white font-bold">SkillBridge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-white/70 hover:text-white text-sm transition-colors">Sign in</Link>
            <Link href="/sign-up" className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-sky-300 text-xs font-semibold uppercase tracking-widest">State-Level Skilling Programme</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-6">
            Attendance, <br />
            <span className="text-sky-400">simplified.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
            End-to-end attendance management for SkillBridge. Five roles, one system — students, trainers, institutions, managers, and monitors.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-8 py-3 rounded-xl text-base transition-colors">
              Create account →
            </Link>
            <Link href="/sign-in" className="text-white/60 hover:text-white text-base transition-colors font-medium">
              Already have an account
            </Link>
          </div>
        </div>

        {/* Roles grid */}
        <div className="mt-20">
          <h2 className="text-center text-white/40 text-sm font-semibold uppercase tracking-widest mb-8">Five roles, distinct views</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {roles.map((role) => (
              <div key={role} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors">
                <span className={`badge-role text-xs px-2 py-0.5 rounded-md ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
                <p className="text-white/50 text-xs mt-3 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

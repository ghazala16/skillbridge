interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  icon?: React.ReactNode;
}

const colorMap = {
  blue: 'bg-sky-50 border-sky-200 text-sky-700',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-violet-50 border-violet-200 text-violet-700',
};

export default function StatCard({ label, value, sub, color = 'blue', icon }: StatCardProps) {
  return (
    <div className={`card p-5 border ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-3xl font-black mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        {icon && <div className="opacity-40 mt-0.5">{icon}</div>}
      </div>
    </div>
  );
}

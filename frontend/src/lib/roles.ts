export const ROLES = {
  student: 'student',
  trainer: 'trainer',
  institution: 'institution',
  programme_manager: 'programme_manager',
  monitoring_officer: 'monitoring_officer',
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  trainer: 'Trainer',
  institution: 'Institution Admin',
  programme_manager: 'Programme Manager',
  monitoring_officer: 'Monitoring Officer',
};

export const ROLE_COLORS: Record<string, string> = {
  student: 'bg-violet-100 text-violet-800',
  trainer: 'bg-sky-100 text-sky-800',
  institution: 'bg-amber-100 text-amber-800',
  programme_manager: 'bg-emerald-100 text-emerald-800',
  monitoring_officer: 'bg-rose-100 text-rose-800',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  student: 'View your sessions and mark your own attendance',
  trainer: 'Create sessions, manage batches and track attendance',
  institution: 'Oversee trainers, batches and attendance summaries',
  programme_manager: 'Monitor all institutions across the programme',
  monitoring_officer: 'Read-only programme-wide attendance view',
};

export function getDashboardPath(role: string): string {
  const paths: Record<string, string> = {
    student: '/dashboard/student',
    trainer: '/dashboard/trainer',
    institution: '/dashboard/institution',
    programme_manager: '/dashboard/programme-manager',
    monitoring_officer: '/dashboard/monitoring-officer',
  };
  return paths[role] || '/dashboard';
}

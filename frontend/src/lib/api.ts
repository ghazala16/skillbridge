const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data;
}

// export async function syncUser(token: string, payload: {
//   clerk_user_id: string;
//   name: string;
//   email: string;
//   role: string;
// }) {
//   const res = await fetch(`${API_URL}/api/users/sync`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   });
//   return res.json();
// }

export async function syncUser(token: string, payload: {
  clerk_user_id: string;
  name: string;
  email: string;
  role: string;
}) {
  const res = await fetch(`${API_URL}/api/users/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, 
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export const api = {
  // Users
  getMe: (token: string) => apiFetch('/api/users/me', token),
  getTrainers: (token: string) => apiFetch('/api/users/trainers', token),

  // Batches
  getBatches: (token: string) => apiFetch('/api/batches', token),
  createBatch: (token: string, data: { name: string }) =>
    apiFetch('/api/batches', token, { method: 'POST', body: JSON.stringify(data) }),
  generateInvite: (token: string, batchId: string) =>
    apiFetch(`/api/batches/${batchId}/invite`, token, { method: 'POST' }),
  joinBatch: (token: string, batchId: string, inviteCode: string) =>
    apiFetch(`/api/batches/${batchId}/join`, token, {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    }),
  getBatchByCode: (code: string) =>
    fetch(`${API_URL}/api/batches/join/${code}`).then(r => r.json()),
  getBatchSummary: (token: string, batchId: string) =>
    apiFetch(`/api/batches/${batchId}/summary`, token),

  // Sessions
  getSessions: (token: string) => apiFetch('/api/sessions', token),
  createSession: (token: string, data: {
    batch_id: string; title: string; date: string;
    start_time: string; end_time: string;
  }) => apiFetch('/api/sessions', token, { method: 'POST', body: JSON.stringify(data) }),
  getSessionAttendance: (token: string, sessionId: string) =>
    apiFetch(`/api/sessions/${sessionId}/attendance`, token),

  // Attendance
  markAttendance: (token: string, sessionId: string, status: string) =>
    apiFetch('/api/attendance/mark', token, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, status }),
    }),

  // Institutions
  getInstitutions: (token: string) => apiFetch('/api/institutions', token),
  createInstitution: (token: string, name: string) =>
    apiFetch('/api/institutions', token, { method: 'POST', body: JSON.stringify({ name }) }),
  getInstitutionSummary: (token: string, id: string) =>
    apiFetch(`/api/institutions/${id}/summary`, token),
  getProgrammeSummary: (token: string) =>
    apiFetch('/api/institutions/programme/summary', token),
};

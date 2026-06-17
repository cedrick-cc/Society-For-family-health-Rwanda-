const API_BASE_URL = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export async function getUsers() {
  return apiRequest('/users');
}

export async function getPendingUsers() {
  return apiRequest('/users/pending');
}

export async function approveUser(id) {
  return apiRequest(`/users/${id}/approve`, {
    method: 'PATCH',
  });
}

export async function rejectUser(id) {
  return apiRequest(`/users/${id}/reject`, {
    method: 'PATCH',
  });
}

export async function deactivateUser(id) {
  return apiRequest(`/users/${id}/deactivate`, {
    method: 'PATCH',
  });
}

export async function activateUser(id) {
  return apiRequest(`/users/${id}/activate`, {
    method: 'PATCH',
  });
}

export async function resetUserPassword(id) {
  return apiRequest(`/users/${id}/reset-password`, {
    method: 'PATCH',
  });
}

export async function updateUser(id, payload) {
  return apiRequest(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createUser(payload) {
  return apiRequest('/auth/create-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyProfile() {
  return apiRequest('/profile/me');
}

export async function updateMyProfile(payload) {
  return apiRequest('/profile/update', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function changeMyPassword(payload) {
  return apiRequest('/profile/change-password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function uploadProfilePhoto(formData) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
    method: 'PATCH',
    body: formData,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'Upload failed.');
  }

  return data;
}

export async function getPrograms() {
  return apiRequest('/programs');
}

export async function getProgram(id) {
  return apiRequest(`/programs/${id}`);
}

export async function createProgram(payload) {
  return apiRequest('/programs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProgram(id, payload) {
  return apiRequest(`/programs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProgram(id) {
  return apiRequest(`/programs/${id}`, {
    method: 'DELETE',
  });
}

export async function getBeneficiaries() {
  return apiRequest('/beneficiaries');
}

export async function getBeneficiary(id) {
  return apiRequest(`/beneficiaries/${id}`);
}

export async function createBeneficiary(payload) {
  return apiRequest('/beneficiaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBeneficiary(id, payload) {
  return apiRequest(`/beneficiaries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteBeneficiary(id) {
  return apiRequest(`/beneficiaries/${id}`, {
    method: 'DELETE',
  });
}

export async function getDashboardStats() {
  return apiRequest('/dashboard/stats');
}

export async function getFieldManagers(params = {}) {
  const qs = new URLSearchParams();
  if (params.availableOnly) qs.set('availableOnly', 'true');
  const query = qs.toString();
  return apiRequest(`/programs/field-managers${query ? `?${query}` : ''}`);
}

export async function getProgramsAsFieldManager() {
  return apiRequest('/programs/as-field-manager');
}

export async function getProgramsAsVolunteer() {
  return apiRequest('/programs/as-volunteer');
}

export async function getAvailableVolunteers(programId) {
  return apiRequest(`/programs/${programId}/available-volunteers`);
}

export async function assignProgramVolunteers(programId, volunteerIds) {
  return apiRequest(`/programs/${programId}/volunteers`, {
    method: 'POST',
    body: JSON.stringify({ volunteerIds }),
  });
}

export async function removeProgramVolunteer(programId, volunteerId) {
  return apiRequest(`/programs/${programId}/volunteers/${volunteerId}`, {
    method: 'DELETE',
  });
}

export async function getVolunteerDashboard() {
  return apiRequest('/volunteer/dashboard');
}

export async function getFieldManagerDashboard() {
  return apiRequest('/field-manager/dashboard');
}

export async function getMyTasks() {
  return apiRequest('/tasks/me');
}

export async function getManagedTasks() {
  return apiRequest('/tasks/managed');
}

export async function createTask(payload) {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id, payload) {
  return apiRequest(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getNotifications() {
  return apiRequest('/notifications');
}

export async function getUnreadNotificationCount() {
  return apiRequest('/notifications/unread-count');
}

export async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all', { method: 'PATCH' });
}

export async function getConversations() {
  return apiRequest('/conversations');
}

export async function createConversation(peerUserId) {
  return apiRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({ peerUserId }),
  });
}

export async function getConversationMessages(conversationId) {
  return apiRequest(`/conversations/${conversationId}/messages`);
}

export async function sendConversationMessage(conversationId, content) {
  return apiRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function markConversationRead(conversationId) {
  return apiRequest(`/conversations/${conversationId}/read`, { method: 'PATCH' });
}

export async function submitFieldReport(formData) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/field-reports`, {
    method: 'POST',
    body: formData,
    headers,
  });
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || 'Failed to submit report.');
  }
  return data;
}

export async function getMyFieldReports() {
  return apiRequest('/field-reports/mine');
}

export async function getPendingFieldReports() {
  return apiRequest('/field-reports/pending');
}

export async function getRecentFieldReports() {
  return apiRequest('/field-reports/recent');
}

export async function reviewFieldReport(id, decision, reviewNotes) {
  return apiRequest(`/field-reports/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({
      decision,
      reviewNotes: reviewNotes != null ? String(reviewNotes) : '',
    }),
  });
}

export async function getMessageUnreadTotal() {
  return apiRequest('/conversations/unread-total');
}

export async function searchMessagingUsers(query) {
  const q = encodeURIComponent(String(query || '').trim());
  return apiRequest(`/messaging/user-search?q=${q}`);
}

export async function getPermissions() {
  return apiRequest('/permissions');
}

export async function updatePermissionValue(payload) {
  return apiRequest('/permissions', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getResources(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/resources${qs ? `?${qs}` : ''}`);
}

export async function createResource(payload) {
  return apiRequest('/resources', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateResource(id, payload) {
  return apiRequest(`/resources/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteResource(id) {
  return apiRequest(`/resources/${id}`, { method: 'DELETE' });
}

export async function restockResource(id, quantity) {
  return apiRequest(`/resources/${id}/restock`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export async function getProgramResources(programId) {
  return apiRequest(`/resources/program/${programId}`);
}

export async function recordResourceUsage(programId, resourceId, quantityUsed) {
  return apiRequest(`/resources/program/${programId}/usage`, {
    method: 'POST',
    body: JSON.stringify({ resourceId, quantityUsed }),
  });
}

export async function getFieldManagerInventory() {
  return apiRequest('/resources/field-manager/inventory');
}

export async function getAnalytics(period = 'monthly') {
  return apiRequest(`/analytics?period=${encodeURIComponent(period)}`);
}

export async function getActivityFeed(take = 30) {
  return apiRequest(`/activity?take=${take}`);
}

export async function getDashboardActivity(take = 20) {
  return apiRequest(`/dashboard/activity?take=${take}`);
}

export async function getProgramsAttention() {
  return apiRequest('/dashboard/programs-attention');
}

export async function getVolunteersList(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.opsStatus) qs.set('opsStatus', params.opsStatus);
  const query = qs.toString();
  return apiRequest(`/volunteers${query ? `?${query}` : ''}`);
}

export async function getVolunteerDetail(id) {
  return apiRequest(`/volunteers/${id}`);
}

export async function updateVolunteer(id, payload) {
  return apiRequest(`/volunteers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateVolunteer(id) {
  return apiRequest(`/volunteers/${id}/deactivate`, { method: 'PATCH' });
}

export async function getAnnouncements() {
  return apiRequest('/announcements');
}

export async function createAnnouncement(payload) {
  return apiRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAnnouncement(id, payload) {
  return apiRequest(`/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAnnouncement(id) {
  return apiRequest(`/announcements/${id}`, { method: 'DELETE' });
}

export async function getScheduledActivities() {
  return apiRequest('/scheduled-activities');
}

export async function createScheduledActivity(payload) {
  return apiRequest('/scheduled-activities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateScheduledActivity(id, payload) {
  return apiRequest(`/scheduled-activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteScheduledActivity(id) {
  return apiRequest(`/scheduled-activities/${id}`, { method: 'DELETE' });
}

export async function getAuditLogs() {
  return apiRequest('/audit-logs');
}

export async function downloadExport(entity, format = 'csv', period, reportType, month, year, week) {
  const token = localStorage.getItem('token');
  const qs = new URLSearchParams({ format });
  if (period) qs.set('period', period);
  if (reportType) qs.set('reportType', reportType);
  if (month !== undefined && month !== null && month !== '') qs.set('month', String(month));
  if (year !== undefined && year !== null && year !== '') qs.set('year', String(year));
  if (week !== undefined && week !== null && week !== '') qs.set('week', String(week));
  const response = await fetch(`${API_BASE_URL}/exports/${entity}?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Export failed.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `${entity}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { API_BASE_URL };

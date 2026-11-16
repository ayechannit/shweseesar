import apiRequest from './api';

// Fetch a file from an authenticated API endpoint and save it in the browser
export const downloadFile = async (endpoint, filename) => {
  const res = await apiRequest(endpoint);
  if (!res) return;
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

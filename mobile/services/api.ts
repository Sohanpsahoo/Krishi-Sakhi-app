import { API_BASE_URL } from '../constants/Config';

/**
 * Build a full API URL from a path
 */
export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE_URL.replace(/\/$/, '') + path;
}

/**
 * Make an API request (wrapper around fetch)
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  console.log(`📡 API ${options.method || 'GET'} → ${url}`);
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });
}

/**
 * Crop Recommendation API
 */
export const getCropRecommendation = async (soilData: any) => {
  const res = await apiFetch('/api/recommendations/crop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(soilData),
  });

  const text = await res.text();
  if (!text) throw new Error('Server returned empty response');

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(json.message || 'Recommendation failed');
  return json;
};

/**
 * Recommendation History API
 */
export const getRecommendationHistory = async (farmerId: string) => {
  const res = await apiFetch(`/api/recommendations/history/${farmerId}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
};

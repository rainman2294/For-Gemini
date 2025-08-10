import { useQuery } from '@tanstack/react-query';

type ActivityFilters = {
  projectId?: string;
  userId?: string;
  search?: string;
  type?: string;
  limit?: number;
};

declare global {
  interface Window {
    pulse2?: { apiUrl: string; mediaUrl: string; nonce: string };
  }
}

const fetchActivities = async (filters: ActivityFilters) => {
  const cfg = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
  const headers: Record<string, string> = {};
  if (cfg?.nonce) headers['X-WP-Nonce'] = cfg.nonce;
  let url = `${cfg?.apiUrl || ''}/activities?limit=${filters.limit || 50}`;
  if (filters.projectId) url += `&project_id=${filters.projectId}`;
  if (filters.userId) url += `&user_id=${filters.userId}`;
  if (filters.search?.trim()) url += `&search=${encodeURIComponent(filters.search.trim())}`;
  if (filters.type && filters.type !== 'all') url += `&type=${encodeURIComponent(filters.type)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch activities');
  return res.json();
};

export function useActivities(filters: ActivityFilters) {
  const enabled = typeof window !== 'undefined' && !!window.pulse2;

  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => fetchActivities(filters),
    enabled,
  });
}
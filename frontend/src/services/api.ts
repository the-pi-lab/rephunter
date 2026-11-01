import type {
  TrendingSince,
  TrendingResponse,
  LanguagesResponse,
  AnalysisRequest,
  AnalysisResponse,
  SettingsResponse,
  SettingsUpdateRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = '';
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || res.statusText;
    } catch {
      errorDetail = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(errorDetail || `Request failed with status ${res.status}`, res.status, errorDetail);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrending(
  since: TrendingSince = 'daily',
  language?: string,
  refresh: boolean = false
): Promise<TrendingResponse> {
  const params = new URLSearchParams();
  params.set('since', since);
  if (language) {
    params.set('language', language);
  }
  if (refresh) {
    params.set('refresh', 'true');
  }

  const res = await fetch(`${API_BASE}/trending?${params.toString()}`);
  return handleResponse<TrendingResponse>(res);
}

export async function fetchLanguages(): Promise<LanguagesResponse> {
  const res = await fetch(`${API_BASE}/languages`);
  return handleResponse<LanguagesResponse>(res);
}

export async function analyzeRepository(req: AnalysisRequest): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<AnalysisResponse>(res);
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${API_BASE}/settings`);
  return handleResponse<SettingsResponse>(res);
}

export async function updateSettings(settings: SettingsUpdateRequest): Promise<SettingsResponse> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse<SettingsResponse>(res);
}

export async function testConnection(req: TestConnectionRequest): Promise<TestConnectionResponse> {
  const res = await fetch(`${API_BASE}/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<TestConnectionResponse>(res);
}

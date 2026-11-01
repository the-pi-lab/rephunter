export type TrendingSince = 'daily' | 'weekly' | 'monthly';

export interface TrendingRepo {
  name: string;
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  language_color: string | null;
  stars: number;
  forks: number;
  period_stars: string | null;
  url: string;
  built_by: string[];
}

export interface TrendingResponse {
  since: TrendingSince;
  language: string | null;
  count: number;
  repositories: TrendingRepo[];
  cached: boolean;
  timestamp: string;
}

export interface LanguageItem {
  name: string;
  slug: string;
}

export interface LanguagesResponse {
  languages: LanguageItem[];
}

export interface AnalysisRequest {
  repo: string;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  url?: string | null;
  period_stars?: string | null;
}

export interface AnalysisResponse {
  repo: string;
  what_it_does: string;
  why_trending: string;
  use_cases: string[];
  target_audience: string;
  technical_summary: string;
  model_used: string;
  analyzed_at: string;
}

export interface ProviderOption {
  id: string;
  name: string;
  default_model: string;
  available_models: string[];
  requires_api_key: boolean;
  requires_base_url: boolean;
  base_url_placeholder: string | null;
  description: string;
}

export interface SettingsResponse {
  provider: string;
  model: string;
  api_base: string | null;
  has_api_key: boolean;
  masked_api_key: string | null;
  available_providers: ProviderOption[];
}

export interface SettingsUpdateRequest {
  provider: string;
  model: string;
  api_key?: string | null;
  api_base?: string | null;
}

export interface TestConnectionRequest {
  provider?: string;
  model?: string;
  api_key?: string;
  api_base?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: string | null;
  model_used?: string | null;
}

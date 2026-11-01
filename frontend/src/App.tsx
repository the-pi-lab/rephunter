import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { RepoCard } from './components/RepoCard';
import { AnalysisModal } from './components/AnalysisModal';
import { SettingsModal } from './components/SettingsModal';
import { SkeletonCard } from './components/SkeletonCard';
import { EmptyState } from './components/EmptyState';
import { ErrorAlert } from './components/ErrorAlert';
import type {
  TrendingSince,
  TrendingRepo,
  LanguageItem,
  SettingsResponse,
  AnalysisResponse,
} from './types';
import {
  fetchTrending,
  fetchLanguages,
  fetchSettings,
  analyzeRepository,
} from './services/api';

export function App() {
  // Filters & Parameters
  const [since, setSince] = useState<TrendingSince>('daily');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  // Status States
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Analysis States
  const [selectedRepo, setSelectedRepo] = useState<TrendingRepo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initial load: settings and languages
  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings:', err));

    fetchLanguages()
      .then((res) => setLanguages(res.languages))
      .catch((err) => console.error('Failed to load languages:', err));
  }, []);

  // Fetch trending repositories
  const loadTrending = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingRepos(true);
      setRepoError(null);
      try {
        const data = await fetchTrending(since, selectedLanguage, forceRefresh);
        setRepos(data.repositories);
      } catch (err: any) {
        setRepoError(err.message || 'Failed to discover trending repositories from GitHub.');
      } finally {
        setIsLoadingRepos(false);
      }
    },
    [since, selectedLanguage]
  );

  useEffect(() => {
    loadTrending(false);
  }, [loadTrending]);

  // Client-side filtering
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos;
    const q = searchQuery.toLowerCase().trim();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.repo.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
    );
  }, [repos, searchQuery]);

  // Handle repository AI explanation
  const handleAnalyze = async (repo: TrendingRepo) => {
    setSelectedRepo(repo);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      const res = await analyzeRepository({
        repo: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        period_stars: repo.period_stars,
        url: repo.url,
      });
      setAnalysis(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed. Please check provider settings.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => loadTrending(true)}
        isLoading={isLoadingRepos}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        since={since}
        onSinceChange={setSince}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        languages={languages}
        totalCount={repos.length}
        filteredCount={filteredRepos.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error notification if trending discovery failed */}
        {repoError && (
          <ErrorAlert
            message={repoError}
            onRetry={() => loadTrending(true)}
            onDismiss={() => setRepoError(null)}
          />
        )}

        {/* Repository Cards Grid */}
        {isLoadingRepos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => (
              <RepoCard
                key={repo.name}
                repo={repo}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing && selectedRepo?.name === repo.name}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilter={Boolean(searchQuery || selectedLanguage)}
            onClearFilter={() => {
              setSearchQuery('');
              setSelectedLanguage('');
            }}
            onRefresh={() => loadTrending(true)}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RepoHunter — Single-purpose GitHub Trending Discovery &amp; AI Explainer</span>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-600 hover:text-slate-900 transition underline cursor-pointer"
            >
              AI Configuration
            </button>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition underline"
            >
              GitHub Trending
            </a>
          </div>
        </div>
      </footer>

      {/* AI Analysis Modal */}
      <AnalysisModal
        repo={selectedRepo}
        analysis={analysis}
        isLoading={isAnalyzing}
        error={analysisError}
        onClose={() => {
          setSelectedRepo(null);
          setAnalysis(null);
          setAnalysisError(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}

export default App;

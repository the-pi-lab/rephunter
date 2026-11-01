import React from 'react';
import { Star, GitFork, TrendingUp, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import type { TrendingRepo } from '../types';

interface RepoCardProps {
  repo: TrendingRepo;
  onAnalyze: (repo: TrendingRepo) => void;
  isAnalyzing: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onAnalyze, isAnalyzing }) => {
  return (
    <div className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between">
      {/* Top Section */}
      <div>
        {/* Header: Title and External Link */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-slate-900 group-hover:text-indigo-600 font-semibold text-base tracking-tight hover:underline transition truncate max-w-full"
            >
              <span className="text-slate-500 font-normal">{repo.owner} /</span>
              <span className="truncate">{repo.repo}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 shrink-0" />
            </a>
          </div>

          {/* Period stars badge */}
          {repo.period_stars && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100 shrink-0">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>{repo.period_stars}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {repo.description || 'No description provided by repository.'}
        </p>
      </div>

      {/* Bottom Section */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Metadata: Language, Stars, Forks, Avatars */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500">
          {/* Programming language */}
          {repo.language && (
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: repo.language_color || '#64748b' }}
              />
              <span className="font-medium text-slate-700">{repo.language}</span>
            </div>
          )}

          {/* Stars */}
          <div className="flex items-center space-x-1" title={`${repo.stars.toLocaleString()} total stars`}>
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span className="font-medium text-slate-700">{formatNumber(repo.stars)}</span>
          </div>

          {/* Forks */}
          <div className="flex items-center space-x-1" title={`${repo.forks.toLocaleString()} total forks`}>
            <GitFork className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatNumber(repo.forks)}</span>
          </div>

          {/* Built by avatars */}
          {repo.built_by && repo.built_by.length > 0 && (
            <div className="hidden lg:flex items-center -space-x-1 pl-1">
              {repo.built_by.slice(0, 4).map((avatar, idx) => (
                <img
                  key={idx}
                  src={avatar}
                  alt="Contributor"
                  className="w-4 h-4 rounded-full border border-white ring-1 ring-slate-200"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>

        {/* AI Analysis Trigger */}
        <button
          onClick={() => onAnalyze(repo)}
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-md transition shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explain with AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

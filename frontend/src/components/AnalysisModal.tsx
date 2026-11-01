import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Flame,
  CheckSquare,
  Users,
  Cpu,
  Loader2,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { TrendingRepo, AnalysisResponse } from '../types';

interface AnalysisModalProps {
  repo: TrendingRepo | null;
  analysis: AnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  repo,
  analysis,
  isLoading,
  error,
  onClose,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);

  if (!repo) return null;

  const handleCopyMarkdown = () => {
    if (!analysis) return;
    const md = `# AI Analysis: ${repo.name}
${repo.url}

## What It Does
${analysis.what_it_does}

## Why It's Trending
${analysis.why_trending}

## Main Use Cases
${analysis.use_cases.map((u) => `- ${u}`).join('\n')}

## Who Should Use It
${analysis.target_audience}

## Technical Summary
${analysis.technical_summary}

---
*Analyzed by RepoHunter AI (${analysis.model_used})*
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{repo.name}</h2>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-indigo-600 transition"
                  title="Open on GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-500">
                {repo.language ? `${repo.language} • ` : ''}
                {repo.stars.toLocaleString()} stars
                {repo.period_stars ? ` • ${repo.period_stars}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {analysis && (
              <button
                onClick={handleCopyMarkdown}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition cursor-pointer"
                title="Copy analysis as Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Loading state */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Synthesizing Repository Analysis</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Querying configured AI provider via LiteLLM to examine purpose, velocity, and architecture...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-amber-900">Analysis Unavailable</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">{error}</p>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition shadow-xs cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>Configure AI Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Content */}
          {analysis && !isLoading && (
            <div className="space-y-4">
              {/* 1. What It Does */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>What It Does</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {analysis.what_it_does}
                </p>
              </div>

              {/* 2. Why It's Trending */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Why It Is Trending</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {analysis.why_trending}
                </p>
              </div>

              {/* 3. Main Use Cases */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs tracking-wider uppercase mb-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Key Use Cases</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {analysis.use_cases.map((useCase, idx) => (
                    <li key={idx} className="flex items-start space-x-2 bg-white border border-slate-200 rounded p-2 shadow-2xs">
                      <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Who Should Use It */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Target Audience</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {analysis.target_audience}
                </p>
              </div>

              {/* 5. Technical Summary */}
              <div className="bg-slate-900 text-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Technical Summary</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono font-normal">
                  {analysis.technical_summary}
                </p>
              </div>

              {/* Footer Meta */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Model: <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">{analysis.model_used}</code></span>
                <span>Analyzed at {new Date(analysis.analyzed_at).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

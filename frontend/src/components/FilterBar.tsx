import React from 'react';
import { Search, Code2, X } from 'lucide-react';
import type { TrendingSince, LanguageItem } from '../types';

interface FilterBarProps {
  since: TrendingSince;
  onSinceChange: (since: TrendingSince) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  languages: LanguageItem[];
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  since,
  onSinceChange,
  selectedLanguage,
  onLanguageChange,
  searchQuery,
  onSearchChange,
  languages,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Since Date Tabs & Language Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => onSinceChange('daily')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                since === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => onSinceChange('weekly')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                since === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This week
            </button>
            <button
              onClick={() => onSinceChange('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                since === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This month
            </button>
          </div>

          {/* Language selector */}
          <div className="relative inline-flex items-center">
            <Code2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="pl-8 pr-7 py-1 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-md hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer appearance-none"
            >
              {languages.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 text-slate-400 text-[10px]">▼</div>
          </div>
        </div>

        {/* Right: Search Filter Input and Count Badge */}
        <div className="flex items-center space-x-2.5">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter repositories..."
              className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-900 rounded-md transition focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {searchQuery ? `${filteredCount} of ${totalCount}` : `${totalCount} repos`}
          </span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Compass, Settings, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SettingsResponse } from '../types';

interface HeaderProps {
  settings: SettingsResponse | null;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onRefresh,
  isLoading,
}) => {
  const isAiReady = settings?.has_api_key || settings?.provider === 'ollama';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">RepoHunter</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">
                  AI AGENT
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Minimal single-purpose agent for GitHub trending discovery & analysis
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* AI Status Pill */}
            <button
              onClick={onOpenSettings}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer hover:bg-slate-50"
              title="Click to manage AI provider"
            >
              {isAiReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-700 font-medium">
                    AI Active: <span className="capitalize font-semibold text-slate-900">{settings?.provider}</span>
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-800 font-medium">AI Not Configured</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-md transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              title="Force refresh trending from GitHub"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-md transition shadow-xs cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

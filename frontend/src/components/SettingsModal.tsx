import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  Server,
  Key,
  Cpu,
  Globe,
  Loader2,
} from 'lucide-react';
import type { SettingsResponse, SettingsUpdateRequest, TestConnectionResponse } from '../types';
import { testConnection, updateSettings } from '../services/api';

interface SettingsModalProps {
  settings: SettingsResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (newSettings: SettingsResponse) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState<string>('gpt-4o-mini');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiBase, setApiBase] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  // Sync state when settings prop loads or opens
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModel(settings.model);
      setApiBase(settings.api_base || '');
      setApiKey(''); // never prefill raw key
      setSaveError(null);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [settings, isOpen]);

  if (!isOpen || !settings) return null;

  const currentProviderConfig = settings.available_providers.find((p) => p.id === provider);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setTestResult(null);
    setSaveError(null);
    const opt = settings.available_providers.find((p) => p.id === newProvider);
    if (opt) {
      setModel(opt.default_model);
      if (opt.id === 'ollama' && !apiBase) {
        setApiBase('http://host.docker.internal:11434');
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSaveError(null);

    try {
      const res = await testConnection({
        provider,
        model,
        api_key: apiKey.trim() || undefined,
        api_base: apiBase.trim() || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Connection failed',
        details: err.message || 'Unknown network error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: SettingsUpdateRequest = {
        provider,
        model,
        api_key: apiKey.trim() ? apiKey.trim() : undefined,
        api_base: apiBase.trim() || null,
      };

      const updated = await updateSettings(payload);
      onSettingsSaved(updated);
      setSaveSuccess(true);
      setApiKey(''); // reset typed key
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const requiresKey = currentProviderConfig ? currentProviderConfig.requires_api_key : true;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">AI Provider Configuration</h2>
              <p className="text-xs text-slate-500">Universal model abstraction powered by LiteLLM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {/* Save Success / Error banners */}
          {saveSuccess && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Configuration saved successfully and persisted across restarts.</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Provider</span>
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
            >
              {settings.available_providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {currentProviderConfig && (
              <p className="text-[11px] text-slate-500 mt-1">{currentProviderConfig.description}</p>
            )}
          </div>

          {/* Model Name Input & Suggestions */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Model Identifier</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini, gemini/gemini-2.0-flash, claude-3-5-haiku-20241022"
              required
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />

            {/* Quick model preset chips */}
            {currentProviderConfig && currentProviderConfig.available_models.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {currentProviderConfig.available_models.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setModel(m)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded border transition cursor-pointer ${
                        model === m
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>API Key {requiresKey ? '' : '(Optional)'}</span>
              </label>
              {settings.has_api_key && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-medium">
                  Configured: {settings.masked_api_key}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  settings.has_api_key
                    ? 'Leave empty to keep existing saved API key, or enter new key'
                    : requiresKey
                    ? 'Enter your API key (e.g. sk-...)'
                    : 'Not required for local provider'
                }
                className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {!requiresKey && (
              <p className="text-[11px] text-slate-400 mt-1">
                Local providers like Ollama run on your machine and do not require an external API key.
              </p>
            )}
          </div>

          {/* Custom API Base URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Custom API Base URL {currentProviderConfig?.requires_base_url ? '(Required)' : '(Optional)'}</span>
            </label>
            <input
              type="url"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder={
                currentProviderConfig?.base_url_placeholder ||
                'Leave blank for default provider endpoint'
              }
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              For Ollama in Docker, use <code className="text-slate-600 font-semibold">http://host.docker.internal:11434</code>.
            </p>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.details && (
                    <p className="text-[11px] mt-0.5 opacity-90 break-all">{testResult.details}</p>
                  )}
                  {testResult.model_used && (
                    <p className="text-[10px] font-mono mt-1 opacity-75">Target: {testResult.model_used}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Callout */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex items-start space-x-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Local Security:</strong> API keys are held exclusively inside the backend server container in your mounted storage directory. They are never rendered or leaked to frontend JavaScript.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-md transition shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-md transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

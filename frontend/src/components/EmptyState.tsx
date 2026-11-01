import React from 'react';
import { SearchX, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  hasFilter: boolean;
  onClearFilter: () => void;
  onRefresh: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasFilter,
  onClearFilter,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">No repositories found</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
        {hasFilter
          ? 'No trending repositories match your search or language filter.'
          : 'Unable to discover trending repositories for this date interval.'}
      </p>

      <div className="mt-4 flex items-center justify-center space-x-2">
        {hasFilter ? (
          <button
            onClick={onClearFilter}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
          >
            Clear Filters
          </button>
        ) : (
          <button
            onClick={onRefresh}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Refreshing</span>
          </button>
        )}
      </div>
    </div>
  );
};

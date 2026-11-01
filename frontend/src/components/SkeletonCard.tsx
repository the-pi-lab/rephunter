import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-4 bg-slate-100 rounded w-16"></div>
        </div>
        <div className="space-y-2 mt-3">
          <div className="h-3 bg-slate-100 rounded w-full"></div>
          <div className="h-3 bg-slate-100 rounded w-4/5"></div>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-3 bg-slate-200 rounded w-16"></div>
          <div className="h-3 bg-slate-100 rounded w-10"></div>
          <div className="h-3 bg-slate-100 rounded w-10"></div>
        </div>
        <div className="h-6 bg-slate-100 rounded w-24"></div>
      </div>
    </div>
  );
};

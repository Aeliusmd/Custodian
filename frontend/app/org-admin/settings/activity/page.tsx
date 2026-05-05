"use client";

import { useEffect, useState } from 'react';
import { settingsApi } from '@/app/org-admin/settings/lib/api';
import type { ActivityLog } from '@/app/org-admin/settings/lib/types';

const TEAL = '#0097B2';

const MODULE_COLORS: Record<string, string> = {
  Documents: 'bg-[#0097B2]/10 text-[#0097B2]',
  Users: 'bg-amber-100 text-amber-700',
  Search: 'bg-purple-100 text-purple-700',
  Categories: 'bg-green-100 text-green-700',
  Settings: 'bg-gray-100 text-gray-600',
};

const MODULE_ICONS: Record<string, string> = {
  Documents: 'ri-file-list-3-line',
  Users: 'ri-team-line',
  Search: 'ri-search-line',
  Categories: 'ri-folder-settings-line',
  Settings: 'ri-settings-3-line',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      const activityLogs = await settingsApi.getActivityLogs();
      setLogs(activityLogs);
      setIsLoading(false);
    };

    void loadLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    if (q && !l.action.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
    if (filterModule && l.module !== filterModule) return false;
    const logDate = l.dateTime.split(' ')[0];
    if (filterDateFrom && logDate < filterDateFrom) return false;
    if (filterDateTo && logDate > filterDateTo) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch('');
    setFilterModule('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasFilters = search || filterModule || filterDateFrom || filterDateTo;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 min-h-full font-inter">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Loading activity logs...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 min-h-full font-inter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a2340]">Activity Logs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track all actions performed in your organization</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 w-full md:flex-1 md:min-w-[200px] border border-gray-200 rounded-lg px-3 py-2">
            <i className="ri-search-line text-gray-400 text-sm" />
            <input
              placeholder="Search actions or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none text-sm text-[#1a2340] bg-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
                className="text-gray-300 hover:text-gray-500 cursor-pointer"
              >
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </div>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            title="Filter by module"
            aria-label="Filter by module"
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer min-w-[140px]"
          >
            <option value="">All Modules</option>
            <option value="Documents">Documents</option>
            <option value="Users">Users</option>
            <option value="Search">Search</option>
            <option value="Categories">Categories</option>
            <option value="Settings">Settings</option>
          </select>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="w-full sm:w-auto justify-center sm:justify-start flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-filter-off-line" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Date & Time</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Action</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Module</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-gray-400">
                    <i className="ri-list-check-2 text-3xl block mb-2" />
                    <p className="text-sm">No activity logs found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-[#0097B2]/[0.02] transition-all">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#1a2340]">{log.dateTime.split(' ')[0]}</div>
                      <div className="text-xs text-gray-400">{log.dateTime.split(' ')[1]}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-[#1a2340] whitespace-nowrap">{log.action}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 w-fit ${MODULE_COLORS[log.module]}`}>
                        <i className={`${MODULE_ICONS[log.module]} text-xs`} />
                        {log.module}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500 max-w-md">{log.description}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {logs.length} log entries</p>
          </div>
        )}
      </div>
    </div>
  );
}

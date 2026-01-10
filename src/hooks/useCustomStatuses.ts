import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ApplicationStatus } from '../types/enums';

export interface CustomStatus {
  id: string;
  name: string;
  color: string; // Tailwind color class
  icon?: string; // Material icon name
  category: 'active' | 'pending' | 'completed' | 'custom';
  order: number; // For sorting/ordering
  createdAt: string;
}

// Default system statuses (cannot be deleted, but can be hidden)
const DEFAULT_STATUSES: CustomStatus[] = [
  { id: 'not-started', name: ApplicationStatus.NotStarted, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', category: 'active', order: 0, createdAt: new Date().toISOString() },
  { id: 'pursuing', name: ApplicationStatus.Pursuing, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', category: 'active', order: 1, createdAt: new Date().toISOString() },
  { id: 'in-progress', name: ApplicationStatus.InProgress, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', category: 'active', order: 2, createdAt: new Date().toISOString() },
  { id: 'submitted', name: ApplicationStatus.Submitted, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', category: 'pending', order: 3, createdAt: new Date().toISOString() },
  { id: 'interview', name: ApplicationStatus.Interview, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', category: 'pending', order: 4, createdAt: new Date().toISOString() },
  { id: 'waitlisted', name: ApplicationStatus.Waitlisted, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', category: 'pending', order: 5, createdAt: new Date().toISOString() },
  { id: 'accepted', name: ApplicationStatus.Accepted, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', category: 'completed', order: 6, createdAt: new Date().toISOString() },
  { id: 'rejected', name: ApplicationStatus.Rejected, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', category: 'completed', order: 7, createdAt: new Date().toISOString() },
  { id: 'withdrawn', name: ApplicationStatus.Withdrawn, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', category: 'completed', order: 8, createdAt: new Date().toISOString() },
  { id: 'skipping', name: ApplicationStatus.Skipping, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', category: 'custom', order: 9, createdAt: new Date().toISOString() },
  { id: 'attending', name: ApplicationStatus.Attending, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', category: 'completed', order: 10, createdAt: new Date().toISOString() },
];

export const useCustomStatuses = () => {
  const [customStatuses, setCustomStatuses] = useLocalStorage<CustomStatus[]>('custom-statuses', []);
  const [hiddenStatusIds, setHiddenStatusIds] = useLocalStorage<Set<string>>('hidden-status-ids', new Set());

  // Get all statuses (default + custom), filtered by visibility
  const getAllStatuses = useCallback((): CustomStatus[] => {
    const all = [...DEFAULT_STATUSES, ...customStatuses]
      .filter(status => !hiddenStatusIds.has(status.id))
      .sort((a, b) => a.order - b.order);
    return all;
  }, [customStatuses, hiddenStatusIds]);

  // Get status by name (for backward compatibility with ApplicationStatus enum)
  const getStatusByName = useCallback((name: string): CustomStatus | undefined => {
    return getAllStatuses().find(s => s.name === name);
  }, [getAllStatuses]);

  // Add custom status
  const addStatus = useCallback((status: Omit<CustomStatus, 'id' | 'createdAt'>) => {
    const newStatus: CustomStatus = {
      ...status,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setCustomStatuses(prev => [...prev, newStatus]);
    return newStatus.id;
  }, [setCustomStatuses]);

  // Update custom status
  const updateStatus = useCallback((id: string, updates: Partial<CustomStatus>) => {
    setCustomStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setCustomStatuses]);

  // Delete custom status (only custom ones, not default)
  const deleteStatus = useCallback((id: string) => {
    if (DEFAULT_STATUSES.some(s => s.id === id)) {
      // Hide default status instead of deleting
      setHiddenStatusIds(prev => new Set([...prev, id]));
    } else {
      setCustomStatuses(prev => prev.filter(s => s.id !== id));
    }
  }, [setCustomStatuses, setHiddenStatusIds]);

  // Show hidden status
  const showStatus = useCallback((id: string) => {
    setHiddenStatusIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [setHiddenStatusIds]);

  // Reorder statuses
  const reorderStatuses = useCallback((statusIds: string[]) => {
    setCustomStatuses(prev => {
      const customMap = new Map(prev.map(s => [s.id, s]));
      return statusIds
        .filter(id => customMap.has(id))
        .map((id, index) => ({ ...customMap.get(id)!, order: index }));
    });
  }, [setCustomStatuses]);

  return {
    allStatuses: getAllStatuses(),
    customStatuses,
    hiddenStatusIds: Array.from(hiddenStatusIds),
    addStatus,
    updateStatus,
    deleteStatus,
    showStatus,
    reorderStatuses,
    getStatusByName,
  };
};

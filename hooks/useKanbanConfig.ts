import { useLocalStorage } from './useLocalStorage';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS, STATUS_COLORS, STATUS_LABELS } from '../constants';

export interface KanbanStatusConfig {
  id: string;
  name: string;
  status: ApplicationStatus | string; // Can be custom status
  color: string;
  order: number;
  isCustom?: boolean; // True for user-created statuses
}

export const useKanbanConfig = () => {
  const [customStatuses, setCustomStatuses] = useLocalStorage<KanbanStatusConfig[]>('kanban-custom-statuses', []);
  const [statusConfig, setStatusConfig] = useLocalStorage<KanbanStatusConfig[]>('kanban-status-config', []);

  // Initialize with default statuses if config is empty
  const getStatusConfig = (): KanbanStatusConfig[] => {
    if (statusConfig.length === 0) {
      // Initialize with default statuses
      const defaults: KanbanStatusConfig[] = STATUS_OPTIONS.map((status, index) => ({
        id: status,
        name: STATUS_LABELS[status],
        status: status,
        color: STATUS_COLORS[status],
        order: index,
        isCustom: false,
      }));
      setStatusConfig(defaults);
      return defaults;
    }
    return statusConfig;
  };

  const addCustomStatus = (name: string, color: string): string => {
    const customId = `custom-${crypto.randomUUID()}`;
    const maxOrder = Math.max(...getStatusConfig().map(s => s.order), -1);
    const newStatus: KanbanStatusConfig = {
      id: customId,
      name,
      status: customId,
      color,
      order: maxOrder + 1,
      isCustom: true,
    };
    setCustomStatuses(prev => [...prev, newStatus]);
    setStatusConfig(prev => [...prev, newStatus].sort((a, b) => a.order - b.order));
    return customId;
  };

  const updateStatus = (id: string, updates: Partial<KanbanStatusConfig>) => {
    setStatusConfig(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      const status = prev.find(s => s.id === id);
      if (status?.isCustom || updates.isCustom) {
        setCustomStatuses(prevCustom => prevCustom.map(s => s.id === id ? { ...s, ...updates } : s));
      }
      return updated;
    });
  };

  const deleteStatus = (id: string) => {
    const status = getStatusConfig().find(s => s.id === id);
    if (status?.isCustom) {
      setCustomStatuses(prev => prev.filter(s => s.id !== id));
    }
    setStatusConfig(prev => prev.filter(s => s.id !== id));
  };

  const reorderStatuses = (statusIds: string[]) => {
    setStatusConfig(prev => {
      const statusMap = new Map(prev.map(s => [s.id, s]));
      return statusIds.map((id, index) => {
        const status = statusMap.get(id);
        return status ? { ...status, order: index } : null;
      }).filter((s): s is KanbanStatusConfig => s !== null);
    });
  };

  const toggleStatusVisibility = (id: string) => {
    // For now, we'll just remove from config (can be restored later)
    // In a full implementation, we'd add a `visible` property
    const status = getStatusConfig().find(s => s.id === id);
    if (status) {
      // Toggle by removing/adding
      const isVisible = statusConfig.some(s => s.id === id);
      if (isVisible) {
        setStatusConfig(prev => prev.filter(s => s.id !== id));
      } else {
        // Restore from defaults or custom
        const toRestore = status.isCustom 
          ? customStatuses.find(s => s.id === id)
          : STATUS_OPTIONS.findIndex(s => s === status.status) >= 0
            ? {
                id: status.status,
                name: STATUS_LABELS[status.status as ApplicationStatus],
                status: status.status,
                color: STATUS_COLORS[status.status as ApplicationStatus],
                order: status.order,
                isCustom: false,
              }
            : null;
        if (toRestore) {
          setStatusConfig(prev => [...prev, toRestore].sort((a, b) => a.order - b.order));
        }
      }
    }
  };

  return {
    statusConfig: getStatusConfig(),
    customStatuses,
    addCustomStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    toggleStatusVisibility,
  };
};

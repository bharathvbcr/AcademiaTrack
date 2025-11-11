import React, { useState, useEffect, useMemo } from 'react';
import { Application } from '../types';
import ApplicationCard from './ApplicationCard';
import { chunk } from '../utils';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  hasActiveFilter: boolean;
}

const getNumColumns = () => {
  if (typeof window !== 'undefined') {
    if (window.matchMedia('(min-width: 1280px)').matches) return 3;
    if (window.matchMedia('(min-width: 768px)').matches) return 2;
  }
  return 1;
};

const ApplicationList: React.FC<ApplicationListProps> = ({ applications, onEdit, onDelete, onUpdate, hasActiveFilter }) => {
  const [numColumns, setNumColumns] = useState(getNumColumns());
  const [expandedRows, setExpandedRows] = useState<boolean[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const newNumColumns = getNumColumns();
      if (newNumColumns !== numColumns) {
        setNumColumns(newNumColumns);
        // Reset expansion state on column change to avoid weirdness
        setExpandedRows([]);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numColumns]);

  const applicationRows = useMemo(() => chunk(applications, numColumns), [applications, numColumns]);

  const toggleRowExpansion = (rowIndex: number) => {
    setExpandedRows(prev => {
      const newExpandedRows = [...prev];
      newExpandedRows[rowIndex] = !newExpandedRows[rowIndex];
      return newExpandedRows;
    });
  };

  if (applications.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {applicationRows.map((row, rowIndex) => 
          row.map(app => (
            <ApplicationCard 
              key={app.id} 
              application={app} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onUpdate={onUpdate}
              isExpanded={expandedRows[rowIndex] || false}
              onToggleExpand={() => toggleRowExpansion(rowIndex)}
            />
          ))
        )}
      </div>
    );
  }

  if (hasActiveFilter) {
    return (
      <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">No Applications Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Try adjusting your search query.</p>
      </div>
    );
  }
  
  return null;
};

export default ApplicationList;
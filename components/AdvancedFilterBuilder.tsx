import React, { useState } from 'react';
import { FilterGroup, FilterCondition, FilterField, FilterOperator, SavedFilter } from '../hooks/useAdvancedFilter';
import { ApplicationStatus, ProgramType, DocumentStatus } from '../types';
import { STATUS_OPTIONS, PROGRAM_TYPE_OPTIONS, DOCUMENT_STATUS_OPTIONS } from '../constants';

interface AdvancedFilterBuilderProps {
  filter: FilterGroup | null;
  onFilterChange: (filter: FilterGroup | null) => void;
  onSave?: (name: string, filter: FilterGroup) => void;
  savedFilters?: SavedFilter[];
  onLoadFilter?: (id: string) => void;
  onDeleteFilter?: (id: string) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  filter,
  onFilterChange,
  onSave,
  savedFilters = [],
  onLoadFilter,
  onDeleteFilter,
}) => {
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const fieldOptions: { value: FilterField; label: string }[] = [
    { value: 'status', label: 'Status' },
    { value: 'programType', label: 'Program Type' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'tags', label: 'Tags' },
    { value: 'fee', label: 'Application Fee' },
    { value: 'universityName', label: 'University Name' },
    { value: 'programName', label: 'Program Name' },
    { value: 'department', label: 'Department' },
    { value: 'location', label: 'Location' },
    { value: 'documentStatus', label: 'Document Status' },
    { value: 'facultyContactStatus', label: 'Faculty Contact Status' },
    { value: 'recommenderStatus', label: 'Recommender Status' },
    { value: 'hasFinancialOffer', label: 'Has Financial Offer' },
    { value: 'admissionChance', label: 'Admission Chance' },
    { value: 'isR1', label: 'R1 University' },
  ];

  const addCondition = () => {
    const newCondition: FilterCondition = {
      field: 'status',
      operator: 'equals',
      value: ApplicationStatus.NotStarted,
    };

    const newFilter: FilterGroup = filter || {
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: [],
    };

    onFilterChange({
      ...newFilter,
      conditions: [...newFilter.conditions, newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    if (!filter) return;
    const newConditions = [...filter.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onFilterChange({ ...filter, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    if (!filter) return;
    const newConditions = filter.conditions.filter((_, i) => i !== index);
    onFilterChange({ ...filter, conditions: newConditions });
  };

  const handleSave = () => {
    if (filter && filterName.trim() && onSave) {
      onSave(filterName.trim(), filter);
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const getOperatorOptions = (field: FilterField) => {
    switch (field) {
      case 'status':
      case 'programType':
      case 'facultyContactStatus':
      case 'recommenderStatus':
      case 'isR1':
      case 'hasFinancialOffer':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
          { value: 'notIn', label: 'Not In' },
        ];
      case 'deadline':
      case 'fee':
      case 'admissionChance':
        return [
          { value: 'lessThan', label: 'Less Than' },
          { value: 'greaterThan', label: 'Greater Than' },
          { value: 'between', label: 'Between' },
        ];
      case 'tags':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'in', label: 'In' },
        ];
      case 'universityName':
      case 'programName':
      case 'department':
      case 'location':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
        ];
      case 'documentStatus':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  };

  const renderValueInput = (condition: FilterCondition, index: number) => {
    const { field, operator, value } = condition;

    switch (field) {
      case 'status':
        if (operator === 'in' || operator === 'notIn') {
          return (
            <select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                updateCondition(index, { value: selected });
              }}
              className="px-3 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA]"
              aria-label="Select status values"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          );
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-2 border rounded-lg"
            aria-label="Select status"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        );

      case 'programType':
        if (operator === 'in' || operator === 'notIn') {
          return (
            <select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                updateCondition(index, { value: selected });
              }}
              className="px-3 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA]"
              aria-label="Select program type values"
            >
              {PROGRAM_TYPE_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          );
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-2 border rounded-lg"
            aria-label="Select program type"
          >
            {PROGRAM_TYPE_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        );

      case 'deadline':
        if (operator === 'between') {
          const [min, max] = Array.isArray(value) ? value : [0, 30];
          return (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={min}
                onChange={(e) => updateCondition(index, { value: [Number(e.target.value), max] })}
                className="px-3 py-2 border rounded-lg w-20"
                placeholder="Min days"
              />
              <span>and</span>
              <input
                type="number"
                value={max}
                onChange={(e) => updateCondition(index, { value: [min, Number(e.target.value)] })}
                className="px-3 py-2 border rounded-lg w-20"
                placeholder="Max days"
              />
            </div>
          );
        }
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
            className="px-3 py-2 border rounded-lg w-32"
            placeholder="Days"
          />
        );

      case 'fee':
      case 'admissionChance':
        if (operator === 'between') {
          const [min, max] = Array.isArray(value) ? value : [0, 100];
          return (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={min}
                onChange={(e) => updateCondition(index, { value: [Number(e.target.value), max] })}
                className="px-3 py-2 border rounded-lg w-24"
                aria-label={`Minimum ${field === 'fee' ? 'fee' : 'admission chance'} value`}
                placeholder="Min"
              />
              <span>and</span>
              <input
                type="number"
                value={max}
                onChange={(e) => updateCondition(index, { value: [min, Number(e.target.value)] })}
                className="px-3 py-2 border rounded-lg w-24"
                aria-label={`Maximum ${field === 'fee' ? 'fee' : 'admission chance'} value`}
                placeholder="Max"
              />
            </div>
          );
        }
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
            className="px-3 py-2 border rounded-lg w-32"
            aria-label={field === 'fee' ? 'Application fee' : 'Admission chance'}
            placeholder={field === 'fee' ? 'Fee' : 'Chance'}
          />
        );

      case 'tags':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-2 border rounded-lg"
            placeholder="Tag name"
          />
        );

      case 'universityName':
      case 'programName':
      case 'department':
      case 'location':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-2 border rounded-lg"
            placeholder="Search text"
          />
        );

      case 'isR1':
      case 'hasFinancialOffer':
        return (
          <select
            value={value ? 'true' : 'false'}
            onChange={(e) => updateCondition(index, { value: e.target.value === 'true' })}
            className="px-3 py-2 border rounded-lg"
            aria-label={field === 'isR1' ? 'R1 University status' : 'Financial offer status'}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-2 border rounded-lg"
            aria-label={`Filter value for ${field}`}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Saved Filters</div>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(saved => (
              <button
                key={saved.id}
                onClick={() => onLoadFilter?.(saved.id)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2"
              >
                <span>{saved.name}</span>
                {onDeleteFilter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFilter(saved.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Delete filter ${saved.name}`}
                  >
                    <MaterialIcon name="close" className="text-sm" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Builder */}
      {filter && (
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-operator" className="text-sm font-medium">Operator:</label>
              <select
                id="filter-operator"
                value={filter.operator}
                onChange={(e) => onFilterChange({ ...filter, operator: e.target.value as FilterOperator })}
                className="px-3 py-1.5 border rounded-lg text-sm"
                aria-label="Filter group operator"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NOT">NOT</option>
              </select>
            </div>
            {onSave && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                <MaterialIcon name="save" className="text-sm" />
                Save Filter
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filter.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <select
                  value={condition.field}
                  onChange={(e) => {
                    const newField = e.target.value as FilterField;
                    const operatorOptions = getOperatorOptions(newField);
                    updateCondition(index, {
                      field: newField,
                      operator: operatorOptions[0].value as any,
                      value: undefined,
                    });
                  }}
                  className="px-3 py-2 border rounded-lg text-sm"
                  aria-label={`Filter field for condition ${index + 1}`}
                >
                  {fieldOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  aria-label={`Filter operator for condition ${index + 1}`}
                >
                  {getOperatorOptions(condition.field).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div className="flex-1">
                  {renderValueInput(condition, index)}
                </div>

                <button
                  onClick={() => removeCondition(index)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  aria-label={`Remove condition ${index + 1}`}
                >
                  <MaterialIcon name="delete" className="text-sm" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addCondition}
            className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <MaterialIcon name="add" className="text-sm" />
            Add Condition
          </button>
        </div>
      )}

      {!filter && (
        <button
          onClick={addCondition}
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center gap-2"
        >
          <MaterialIcon name="add" className="text-sm" />
          Create New Filter
        </button>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!filterName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterBuilder;

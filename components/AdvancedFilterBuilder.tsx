import React, { useState } from 'react';
import { FilterGroup, FilterCondition, FilterField, FilterOperator, SavedFilter } from '../hooks/useAdvancedFilter';
import { ApplicationStatus, ProgramType, DocumentStatus } from '../types';
import { STATUS_OPTIONS, PROGRAM_TYPE_OPTIONS, DOCUMENT_STATUS_OPTIONS } from '../constants';
import { formPrimaryBtnClass, formSecondaryBtnClass, formInputClass, formInlineInputClass, formInlineInputSmClass, MaterialIcon } from './ApplicationFormUI';

interface AdvancedFilterBuilderProps {
  filter: FilterGroup | null;
  onFilterChange: (filter: FilterGroup | null) => void;
  onSave?: (name: string, filter: FilterGroup) => void;
  savedFilters?: SavedFilter[];
  onLoadFilter?: (id: string) => void;
  onDeleteFilter?: (id: string) => void;
}

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

  const getOperatorOptions = (field: FilterField): { value: FilterCondition['operator']; label: string }[] => {
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
              className={formInlineInputClass}
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
            className={formInlineInputClass}
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
              className={formInlineInputClass}
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
            className={formInlineInputClass}
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
                aria-label="Minimum days until deadline"
                value={min}
                onChange={(e) => updateCondition(index, { value: [Number(e.target.value), max] })}
                className={`${formInlineInputClass} w-20`}
                placeholder="Min days"
              />
              <span>and</span>
              <input
                type="number"
                aria-label="Maximum days until deadline"
                value={max}
                onChange={(e) => updateCondition(index, { value: [min, Number(e.target.value)] })}
                className={`${formInlineInputClass} w-20`}
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
            className={`${formInlineInputClass} w-32`}
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
                className={`${formInlineInputClass} w-24`}
                aria-label={`Minimum ${field === 'fee' ? 'fee' : 'admission chance'} value`}
                placeholder="Min"
              />
              <span>and</span>
              <input
                type="number"
                value={max}
                onChange={(e) => updateCondition(index, { value: [min, Number(e.target.value)] })}
                className={`${formInlineInputClass} w-24`}
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
            className={`${formInlineInputClass} w-32`}
            aria-label={field === 'fee' ? 'Application fee' : 'Admission chance'}
            placeholder={field === 'fee' ? 'Fee' : 'Chance'}
          />
        );

      case 'tags':
        return (
          <input
            type="text"
            aria-label="Tag to filter by"
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className={formInlineInputClass}
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
            aria-label={`Filter by ${field}`}
            value={value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className={formInlineInputClass}
            placeholder="Search text"
          />
        );

      case 'isR1':
      case 'hasFinancialOffer':
        return (
          <select
            value={value ? 'true' : 'false'}
            onChange={(e) => updateCondition(index, { value: e.target.value === 'true' })}
            className={formInlineInputClass}
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
            className={formInlineInputClass}
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
        <div className="p-4 bg-[#18181b] rounded-lg">
          <div className="text-sm font-semibold text-[#a1a1aa] mb-2">Saved Filters</div>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(saved => (
              <div key={saved.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm hover:bg-[#27272a]">
                <button
                  onClick={() => onLoadFilter?.(saved.id)}
                  className="flex-1 text-left"
                  aria-label={`Load filter: ${saved.name}`}
                >
                  <span>{saved.name}</span>
                </button>
                {onDeleteFilter && (
                  <button
                    onClick={() => onDeleteFilter(saved.id)}
                    className="text-red-400 hover:text-red-300 ml-auto"
                    aria-label={`Delete filter ${saved.name}`}
                  >
                    <MaterialIcon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Builder */}
      {filter && (
        <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-operator" className="text-sm font-medium">Operator:</label>
              <select
                id="filter-operator"
                value={filter.operator}
                onChange={(e) => onFilterChange({ ...filter, operator: e.target.value as FilterOperator })}
                className={formInlineInputSmClass}
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
                className={`${formPrimaryBtnClass} px-3 py-1.5 text-sm`}
              >
                <MaterialIcon name="save" className="text-sm" />
                Save Filter
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filter.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-[#09090b] rounded-lg">
                <select
                  value={condition.field}
                  onChange={(e) => {
                    const newField = e.target.value as FilterField;
                    const operatorOptions = getOperatorOptions(newField);
                    updateCondition(index, {
                      field: newField,
                      operator: operatorOptions[0].value,
                      value: undefined,
                    });
                  }}
                  className={`${formInlineInputClass} text-sm`}
                  aria-label={`Filter field for condition ${index + 1}`}
                >
                  {fieldOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, { operator: e.target.value as FilterCondition['operator'] })}
                  className={`${formInlineInputClass} text-sm`}
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
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                  aria-label={`Remove condition ${index + 1}`}
                >
                  <MaterialIcon name="delete" className="text-sm" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addCondition}
            className="mt-3 px-4 py-2 bg-[#27272a] text-[#a1a1aa] rounded-lg text-sm hover:bg-[#3f3f46] flex items-center gap-2"
          >
            <MaterialIcon name="add" className="text-sm" />
            Add Condition
          </button>
        </div>
      )}

      {!filter && (
        <button
          onClick={addCondition}
          className="w-full px-4 py-3 bg-[#27272a] text-[#a1a1aa] rounded-lg text-sm hover:bg-[#3f3f46] flex items-center justify-center gap-2"
        >
          <MaterialIcon name="add" className="text-sm" />
          Create New Filter
        </button>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" aria-hidden="true">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-filter-title"
            className="bg-[#18181b] rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 id="save-filter-title" className="text-lg font-semibold mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name"
              className={`${formInputClass} mb-4`}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
                className={formSecondaryBtnClass}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!filterName.trim()}
                className={formPrimaryBtnClass}
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

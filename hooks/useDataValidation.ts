import { useMemo } from 'react';
import { Application, ApplicationStatus, DocumentStatus } from '../types';

export interface ValidationRule {
  id: string;
  field: string;
  type: 'required' | 'type' | 'range' | 'custom' | 'cross-field';
  message: string;
  validator: (app: Application) => boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  applicationId: string;
  errors: ValidationRule[];
  warnings: ValidationRule[];
  info: ValidationRule[];
  completeness: number; // 0-100
}

export const useDataValidation = (applications: Application[]) => {
  const defaultRules: ValidationRule[] = [
    {
      id: 'university-name-required',
      field: 'universityName',
      type: 'required',
      message: 'University name is required',
      validator: (app) => !!app.universityName && app.universityName.trim().length > 0,
      severity: 'error',
    },
    {
      id: 'program-name-required',
      field: 'programName',
      type: 'required',
      message: 'Program name is required',
      validator: (app) => !!app.programName && app.programName.trim().length > 0,
      severity: 'error',
    },
    {
      id: 'deadline-past-warning',
      field: 'deadline',
      type: 'custom',
      message: 'Deadline is in the past for non-submitted application',
      validator: (app) => {
        if (!app.deadline || app.status === ApplicationStatus.Submitted) return true;
        const deadline = new Date(app.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return deadline >= today;
      },
      severity: 'warning',
    },
    {
      id: 'submitted-docs-required',
      field: 'documents',
      type: 'cross-field',
      message: 'All required documents must be submitted when status is Submitted',
      validator: (app) => {
        if (app.status !== ApplicationStatus.Submitted) return true;
        const requiredDocs = Object.values(app.documents).filter(d => d.required);
        return requiredDocs.every(d => d.status === DocumentStatus.Submitted);
      },
      severity: 'error',
    },
    {
      id: 'portal-link-format',
      field: 'portalLink',
      type: 'type',
      message: 'Portal link must be a valid URL',
      validator: (app) => {
        if (!app.portalLink) return true;
        try {
          new URL(app.portalLink);
          return true;
        } catch {
          return false;
        }
      },
      severity: 'warning',
    },
    {
      id: 'admission-chance-range',
      field: 'admissionChance',
      type: 'range',
      message: 'Admission chance must be between 0 and 100',
      validator: (app) => {
        if (app.admissionChance === undefined) return true;
        return app.admissionChance >= 0 && app.admissionChance <= 100;
      },
      severity: 'warning',
    },
    {
      id: 'fee-positive',
      field: 'applicationFee',
      type: 'range',
      message: 'Application fee must be positive',
      validator: (app) => app.applicationFee >= 0,
      severity: 'warning',
    },
  ];

  const validateApplication = (app: Application, rules: ValidationRule[] = defaultRules): ValidationResult => {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];
    const info: ValidationRule[] = [];

    rules.forEach(rule => {
      const isValid = rule.validator(app);
      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push(rule);
        } else if (rule.severity === 'warning') {
          warnings.push(rule);
        } else {
          info.push(rule);
        }
      }
    });

    // Calculate completeness
    const requiredFields = ['universityName', 'programName', 'department', 'deadline'];
    const filledFields = requiredFields.filter(field => {
      const value = app[field as keyof Application];
      return value !== null && value !== undefined && value !== '';
    });
    const completeness = Math.round((filledFields.length / requiredFields.length) * 100);

    return {
      applicationId: app.id,
      errors,
      warnings,
      info,
      completeness,
    };
  };

  const validateAll = (rules: ValidationRule[] = defaultRules): ValidationResult[] => {
    return applications.map(app => validateApplication(app, rules));
  };

  const detectDuplicates = (): Application[][] => {
    const groups: { [key: string]: Application[] } = {};
    
    applications.forEach(app => {
      const key = `${app.universityName.toLowerCase()}_${app.programName.toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(app);
    });

    return Object.values(groups).filter(group => group.length > 1);
  };

  const getCompletenessStats = () => {
    const results = validateAll();
    const avgCompleteness = results.reduce((sum, r) => sum + r.completeness, 0) / results.length;
    const incomplete = results.filter(r => r.completeness < 100).length;
    const hasErrors = results.filter(r => r.errors.length > 0).length;
    const hasWarnings = results.filter(r => r.warnings.length > 0).length;

    return {
      averageCompleteness: Math.round(avgCompleteness),
      incompleteCount: incomplete,
      errorCount: hasErrors,
      warningCount: hasWarnings,
      totalApplications: applications.length,
    };
  };

  return {
    validateApplication,
    validateAll,
    detectDuplicates,
    getCompletenessStats,
    defaultRules,
  };
};

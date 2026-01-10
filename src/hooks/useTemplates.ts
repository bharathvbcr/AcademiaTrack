import { useState, useCallback } from 'react';
import { Application, ProgramType, ApplicationStatus, DocumentStatus, TestStatus, ApplicationFeeWaiverStatus } from '../types';
import { useLocalStorage } from './useLocalStorage';

export interface ApplicationTemplate {
  id: string;
  name: string;
  description?: string;
  programType: ProgramType;
  defaultValues: Partial<Application>;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

const defaultTemplates: ApplicationTemplate[] = [
  {
    id: 'phd-cs',
    name: 'PhD in Computer Science',
    description: 'Template for PhD applications in Computer Science',
    programType: ProgramType.PhD,
    defaultValues: {
      programType: ProgramType.PhD,
      applicationFee: 75,
      feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
      gre: { status: TestStatus.Required },
      englishTest: { type: 'TOEFL', status: TestStatus.Required },
      documents: {
        cv: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        statementOfPurpose: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        transcripts: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor1: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor2: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor3: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        writingSample: { required: false, status: DocumentStatus.NotStarted, submitted: null },
      },
      isR1: true,
    },
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
  {
    id: 'masters-funded',
    name: 'Master\'s with Funding',
    description: 'Template for Master\'s programs with funding opportunities',
    programType: ProgramType.Masters,
    defaultValues: {
      programType: ProgramType.Masters,
      applicationFee: 60,
      feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
      gre: { status: TestStatus.Required },
      englishTest: { type: 'TOEFL', status: TestStatus.Required },
      documents: {
        cv: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        statementOfPurpose: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        transcripts: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor1: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor2: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor3: { required: false, status: DocumentStatus.NotStarted, submitted: null },
        writingSample: { required: false, status: DocumentStatus.NotStarted, submitted: null },
      },
    },
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
];

export const useTemplates = () => {
  const [templates, setTemplates] = useLocalStorage<ApplicationTemplate[]>('application-templates', defaultTemplates);

  const createTemplate = useCallback((name: string, description: string, defaultValues: Partial<Application>) => {
    const newTemplate: ApplicationTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      programType: defaultValues.programType || ProgramType.PhD,
      defaultValues,
      createdAt: new Date().toISOString(),
      useCount: 0,
    };
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate.id;
  }, [setTemplates]);

  const updateTemplate = useCallback((id: string, updates: Partial<ApplicationTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setTemplates]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [setTemplates]);

  const useTemplate = useCallback((id: string): Partial<Application> | null => {
    const template = templates.find(t => t.id === id);
    if (template) {
      setTemplates(prev => prev.map(t => 
        t.id === id 
          ? { ...t, lastUsed: new Date().toISOString(), useCount: t.useCount + 1 }
          : t
      ));
      return template.defaultValues;
    }
    return null;
  }, [templates, setTemplates]);

  const createFromApplication = useCallback((name: string, application: Application) => {
    const defaultValues: Partial<Application> = {
      programType: application.programType,
      applicationFee: application.applicationFee,
      feeWaiverStatus: application.feeWaiverStatus,
      gre: application.gre,
      englishTest: application.englishTest,
      documents: application.documents,
      isR1: application.isR1,
      department: application.department,
    };
    return createTemplate(name, `Template created from ${application.universityName}`, defaultValues);
  }, [createTemplate]);

  return {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    createFromApplication,
  };
};

import { useState, useEffect, useCallback } from 'react';
import {
    Application, ApplicationStatus, ApplicationFeeWaiverStatus,
    DocumentStatus, FacultyContactStatus, ProgramType, TestStatus,
    RecommenderStatus, ScholarshipStatus, StipendFrequency, HealthInsuranceCoverage, AssistantshipType
} from '../types';

export const emptyApplication: Application = {
    id: '',
    universityName: '',
    programName: '',
    programType: ProgramType.PhD,
    department: '',
    location: '',
    isR1: false,
    universityRanking: '',
    departmentRanking: '',
    status: ApplicationStatus.NotStarted,
    deadline: null,
    preferredDeadline: null,
    admissionTerm: null,
    admissionYear: null,
    applicationFee: 0,
    feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
    portalLink: '',
    documents: {
        cv: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        statementOfPurpose: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        transcripts: { required: true, status: DocumentStatus.NotStarted, submitted: null },
        lor1: { required: false, status: DocumentStatus.NotStarted, submitted: null },
        lor2: { required: false, status: DocumentStatus.NotStarted, submitted: null },
        lor3: { required: false, status: DocumentStatus.NotStarted, submitted: null },
        writingSample: { required: false, status: DocumentStatus.NotStarted, submitted: null },
    },
    gre: {
        status: TestStatus.NotApplicable,
    },
    englishTest: {
        type: 'Not Required',
        status: TestStatus.NotApplicable,
    },
    facultyContacts: [],
    recommenders: [],
    reminders: [],
    notes: '',
    financialOffer: {
        received: false,
        stipendAmount: 0,
        stipendFrequency: StipendFrequency.Yearly,
        tuitionWaiver: 0,
        healthInsurance: HealthInsuranceCoverage.None,
        assistantship: AssistantshipType.None,
        assistantshipHours: 0,
        notes: ''
    },
    scholarships: []
};

export const useApplicationForm = (isOpen: boolean, applicationToEdit?: Application) => {
    const [appData, setAppData] = useState<Application>(emptyApplication);
    const [isFacultyOpen, setIsFacultyOpen] = useState<boolean[]>([]);
    const [isRecommenderOpen, setIsRecommenderOpen] = useState<boolean[]>([]);
    const [isScholarshipOpen, setIsScholarshipOpen] = useState<boolean[]>([]);

    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            if (applicationToEdit) {
                const migratedFaculty = (applicationToEdit.facultyContacts || []).map(f => ({
                    ...f,
                    contactStatus: f.contactStatus || FacultyContactStatus.NotContacted,
                    contactDate: f.contactDate || null
                }));

                const normalizedDocs: Application['documents'] = { ...emptyApplication.documents };
                if (applicationToEdit.documents) {
                    const today = new Date().toISOString().split('T')[0];
                    for (const key in normalizedDocs) {
                        const docKey = key as keyof typeof normalizedDocs;
                        const oldDocValue = (applicationToEdit.documents as any)[docKey];

                        if (typeof oldDocValue === 'object' && oldDocValue !== null) {
                            const hasStatus = 'status' in oldDocValue;
                            const submittedDate = oldDocValue.submitted || null;

                            normalizedDocs[docKey] = {
                                required: oldDocValue.required ?? true,
                                status: hasStatus ? oldDocValue.status : (submittedDate ? DocumentStatus.Submitted : DocumentStatus.NotStarted),
                                submitted: submittedDate,
                                filePath: oldDocValue.filePath
                            };
                        } else {
                            normalizedDocs[docKey] = {
                                required: true,
                                status: oldDocValue ? DocumentStatus.Submitted : DocumentStatus.NotStarted,
                                submitted: oldDocValue ? (typeof oldDocValue === 'string' ? oldDocValue : today) : null
                            };
                        }
                    }
                }

                const { gre, admissionTerm, admissionYear, ...rest } = applicationToEdit;

                setAppData({
                    ...emptyApplication,
                    ...rest,
                    programType: applicationToEdit.programType || ProgramType.PhD,
                    customProgramType: applicationToEdit.customProgramType || '',
                    facultyContacts: migratedFaculty,
                    documents: normalizedDocs,
                    gre: {
                        status: (gre as any)?.status ?? TestStatus.NotApplicable,
                        cost: (gre as any)?.cost
                    },
                    englishTest: (applicationToEdit as any).englishTest || { type: 'Not Required', status: TestStatus.NotApplicable },
                    recommenders: applicationToEdit.recommenders || [],
                    reminders: applicationToEdit.reminders || [],
                    admissionTerm: admissionTerm || null,
                    admissionYear: admissionYear || null
                });

                setIsFacultyOpen(new Array(migratedFaculty.length).fill(false));
                setIsRecommenderOpen(new Array(applicationToEdit.recommenders?.length || 0).fill(false));
                setIsScholarshipOpen(new Array(applicationToEdit.scholarships?.length || 0).fill(false));
            } else {
                setAppData(emptyApplication);
                setIsFacultyOpen([]);
                setIsRecommenderOpen([]);
                setIsScholarshipOpen([]);
            }
        }
    }, [isOpen, applicationToEdit]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleNumericChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAppData(prev => ({ ...prev, [name]: value === '' ? '' : Math.max(0, parseInt(value, 10)) }));
    }, []);

    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAppData(prev => ({ ...prev, [name]: checked }));
    }, []);

    const handleDocumentChange = useCallback((docKey: keyof Application['documents'], field: 'required' | 'status' | 'submitted', value: any) => {
        setAppData(prev => {
            const newDocuments = { ...prev.documents };
            const doc = { ...newDocuments[docKey] };

            if (field === 'required') {
                doc.required = value;
                if (!value) {
                    doc.status = DocumentStatus.NotStarted;
                    doc.submitted = null;
                }
            } else if (field === 'status') {
                doc.status = value;
                if (value === DocumentStatus.Submitted && !doc.submitted) {
                    doc.submitted = new Date().toISOString().split('T')[0];
                } else if (value !== DocumentStatus.Submitted) {
                    doc.submitted = null;
                }
            } else if (field === 'submitted') {
                doc.submitted = value;
                if (value && doc.status !== DocumentStatus.Submitted) {
                    doc.status = DocumentStatus.Submitted;
                }
            }

            newDocuments[docKey] = doc;
            return { ...prev, documents: newDocuments };
        });
    }, []);

    // Document file attachment handlers
    const handleAttachFile = useCallback(async (docKey: keyof Application['documents']) => {
        if (!window.electron) {
            console.warn('File attachment only available in Electron');
            return;
        }

        try {
            const filePath = await window.electron.selectFile();
            if (filePath) {
                // For new applications, we store the source path temporarily
                // For existing applications, we copy to app storage
                const appId = appData.id || `temp-${Date.now()}`;
                const result = await window.electron.copyDocument(filePath, appId, docKey);

                if (result.success && result.path) {
                    setAppData(prev => {
                        const newDocuments = { ...prev.documents };
                        newDocuments[docKey] = {
                            ...newDocuments[docKey],
                            filePath: result.path
                        };
                        return { ...prev, documents: newDocuments };
                    });
                } else {
                    console.error('Failed to copy document:', result.error);
                }
            }
        } catch (error) {
            console.error('Error attaching file:', error);
        }
    }, [appData.id]);

    const handleOpenFile = useCallback(async (filePath: string) => {
        if (!window.electron) {
            console.warn('File opening only available in Electron');
            return;
        }

        try {
            await window.electron.openFile(filePath);
        } catch (error) {
            console.error('Error opening file:', error);
        }
    }, []);

    const handleRemoveFile = useCallback(async (docKey: keyof Application['documents']) => {
        const filePath = appData.documents[docKey].filePath;

        if (filePath && window.electron) {
            try {
                await window.electron.deleteDocument(filePath);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        setAppData(prev => {
            const newDocuments = { ...prev.documents };
            newDocuments[docKey] = {
                ...newDocuments[docKey],
                filePath: undefined
            };
            return { ...prev, documents: newDocuments };
        });
    }, [appData.documents]);

    const handleFacultyChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[index] };
            if (name === 'contactStatus') {
                const newStatus = value as FacultyContactStatus;
                facultyToUpdate.contactStatus = newStatus;
                if (newStatus === FacultyContactStatus.NotContacted) facultyToUpdate.contactDate = null;
                else if (!facultyToUpdate.contactDate) facultyToUpdate.contactDate = new Date().toISOString().split('T')[0];
            } else (facultyToUpdate as any)[name] = value;
            updatedFaculty[index] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    const handleFacultyMarkdownChange = useCallback((index: number, field: string, value: string) => {
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[index], [field]: value };
            updatedFaculty[index] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    const addFacultyContact = useCallback(() => {
        if (appData.facultyContacts.length >= 3) return;
        setAppData(prev => ({
            ...prev,
            facultyContacts: [...prev.facultyContacts, {
                id: Date.now(),
                name: '',
                website: '',
                email: '',
                researchArea: '',
                contactStatus: FacultyContactStatus.NotContacted,
                contactDate: null,
                interviewDate: null,
                interviewNotes: '',
                questions: '',
                answers: '',
                papersRead: [],
                fitScore: 5,
                fitNotes: '',
                correspondence: []
            }]
        }));
        setIsFacultyOpen(prev => [...prev, true]);
    }, [appData.facultyContacts]);

    const removeFacultyContact = useCallback((indexToRemove: number) => {
        setAppData(prev => ({ ...prev, facultyContacts: prev.facultyContacts.filter((_, index) => index !== indexToRemove) }));
        setIsFacultyOpen(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    // Faculty Research Fit Handlers
    const handleFacultyFitChange = useCallback((index: number, field: 'fitScore' | 'fitNotes', value: any) => {
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[index], [field]: value };
            updatedFaculty[index] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    const addPaperRead = useCallback((index: number, paper: string) => {
        if (!paper.trim()) return;
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[index] };
            facultyToUpdate.papersRead = [...(facultyToUpdate.papersRead || []), paper];
            updatedFaculty[index] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    const removePaperRead = useCallback((facultyIndex: number, paperIndex: number) => {
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[facultyIndex] };
            facultyToUpdate.papersRead = (facultyToUpdate.papersRead || []).filter((_, i) => i !== paperIndex);
            updatedFaculty[facultyIndex] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    // Faculty Correspondence Handlers
    const addCorrespondence = useCallback((index: number, correspondence: any) => {
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[index] };
            facultyToUpdate.correspondence = [...(facultyToUpdate.correspondence || []), { ...correspondence, id: Date.now() }];
            updatedFaculty[index] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    const removeCorrespondence = useCallback((facultyIndex: number, correspondenceId: string | number) => {
        setAppData(prev => {
            const updatedFaculty = [...prev.facultyContacts];
            const facultyToUpdate = { ...updatedFaculty[facultyIndex] };
            facultyToUpdate.correspondence = (facultyToUpdate.correspondence || []).filter(c => c.id !== correspondenceId);
            updatedFaculty[facultyIndex] = facultyToUpdate;
            return { ...prev, facultyContacts: updatedFaculty };
        });
    }, []);

    // Essay Handlers
    const addEssay = useCallback((type: any, name: string) => {
        setAppData(prev => ({
            ...prev,
            essays: [...(prev.essays || []), {
                id: Date.now(),
                type,
                name,
                status: 'Not Started',
                drafts: []
            }]
        }));
    }, []);

    const removeEssay = useCallback((essayId: string | number) => {
        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).filter(e => e.id !== essayId)
        }));
    }, []);

    const updateEssayStatus = useCallback((essayId: string | number, status: any) => {
        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).map(e => e.id === essayId ? { ...e, status } : e)
        }));
    }, []);

    const addEssayDraft = useCallback((essayId: string | number, draft: any) => {
        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).map(e => {
                if (e.id === essayId) {
                    return {
                        ...e,
                        drafts: [...e.drafts, { ...draft, id: Date.now() }]
                    };
                }
                return e;
            })
        }));
    }, []);

    const removeEssayDraft = useCallback((essayId: string | number, draftId: string | number) => {
        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).map(e => {
                if (e.id === essayId) {
                    return {
                        ...e,
                        drafts: e.drafts.filter(d => d.id !== draftId)
                    };
                }
                return e;
            })
        }));
    }, []);

    const updateEssayDraft = useCallback((essayId: string | number, draftId: string | number, field: any, value: any) => {
        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).map(e => {
                if (e.id === essayId) {
                    return {
                        ...e,
                        drafts: e.drafts.map(d => d.id === draftId ? { ...d, [field]: value } : d)
                    };
                }
                return e;
            })
        }));
    }, []);

    // Essay Draft file attachment handlers
    const handleAttachEssayDraftFile = useCallback(async (essayId: string | number, draftId: string | number) => {
        if (!window.electron) {
            console.warn('File attachment only available in Electron');
            return;
        }

        try {
            const filePath = await window.electron.selectFile();
            if (filePath) {
                const appId = appData.id || `temp-${Date.now()}`;
                const result = await window.electron.copyDocument(filePath, appId, `essay-${essayId}-draft-${draftId}`);

                if (result.success && result.path) {
                    setAppData(prev => ({
                        ...prev,
                        essays: (prev.essays || []).map(e => {
                            if (e.id === essayId) {
                                return {
                                    ...e,
                                    drafts: e.drafts.map(d => d.id === draftId ? { ...d, filePath: result.path } : d)
                                };
                            }
                            return e;
                        })
                    }));
                } else {
                    console.error('Failed to copy essay draft file:', result.error);
                }
            }
        } catch (error) {
            console.error('Error attaching essay draft file:', error);
        }
    }, [appData.id]);

    const handleOpenEssayDraftFile = useCallback(async (filePath: string) => {
        if (!window.electron) {
            console.warn('File opening only available in Electron');
            return;
        }

        try {
            await window.electron.openFile(filePath);
        } catch (error) {
            console.error('Error opening essay draft file:', error);
        }
    }, []);

    const handleRemoveEssayDraftFile = useCallback(async (essayId: string | number, draftId: string | number, filePath: string) => {
        if (filePath && window.electron) {
            try {
                await window.electron.deleteDocument(filePath);
            } catch (error) {
                console.error('Error deleting essay draft file:', error);
            }
        }

        setAppData(prev => ({
            ...prev,
            essays: (prev.essays || []).map(e => {
                if (e.id === essayId) {
                    return {
                        ...e,
                        drafts: e.drafts.map(d => d.id === draftId ? { ...d, filePath: undefined } : d)
                    };
                }
                return e;
            })
        }));
    }, []);


    const handleRecommenderChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAppData(prev => {
            const updatedRecommenders = [...(prev.recommenders || [])];
            const recommenderToUpdate = { ...updatedRecommenders[index], [name]: value };
            updatedRecommenders[index] = recommenderToUpdate;
            return { ...prev, recommenders: updatedRecommenders };
        });
    }, []);

    const addRecommender = useCallback(() => {
        setAppData(prev => ({
            ...prev,
            recommenders: [...(prev.recommenders || []), {
                id: Date.now(),
                name: '',
                title: '',
                email: '',
                relationship: '',
                status: RecommenderStatus.NotStarted,
                dateRequested: null,
                dateSubmitted: null,
                notes: ''
            }]
        }));
        setIsRecommenderOpen(prev => [...prev, true]);
    }, []);

    const removeRecommender = useCallback((indexToRemove: number) => {
        setAppData(prev => ({
            ...prev,
            recommenders: (prev.recommenders || []).filter((_, index) => index !== indexToRemove)
        }));
        setIsRecommenderOpen(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const addReminder = useCallback(() => {
        const text = prompt('Enter reminder text:');
        if (text) {
            setAppData(prev => ({
                ...prev,
                reminders: [...(prev.reminders || []), { id: Date.now().toString(), text, date: new Date().toISOString().split('T')[0], completed: false }]
            }));
        }
    }, []);

    const toggleReminder = useCallback((id: string) => {
        setAppData(prev => ({
            ...prev,
            reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, completed: !r.completed } : r)
        }));
    }, []);

    const deleteReminder = useCallback((id: string) => {
        setAppData(prev => ({
            ...prev,
            reminders: (prev.reminders || []).filter(r => r.id !== id)
        }));
    }, []);

    const updateReminderDate = useCallback((id: string, date: string) => {
        setAppData(prev => ({
            ...prev,
            reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, date } : r)
        }));
    }, []);

    // Financial Handlers
    const handleFinancialOfferChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppData(prev => ({
            ...prev,
            financialOffer: {
                ...prev.financialOffer!,
                [name]: value
            }
        }));
    }, []);

    const handleFinancialNumericChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAppData(prev => ({
            ...prev,
            financialOffer: {
                ...prev.financialOffer!,
                [name]: value === '' ? 0 : parseFloat(value)
            }
        }));
    }, []);

    const handleFinancialCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAppData(prev => ({
            ...prev,
            financialOffer: {
                ...prev.financialOffer!,
                [name]: checked
            }
        }));
    }, []);

    // Scholarship Handlers
    const addScholarship = useCallback(() => {
        setAppData(prev => ({
            ...prev,
            scholarships: [...(prev.scholarships || []), {
                id: Date.now(),
                name: '',
                amount: 0,
                duration: '',
                deadline: null,
                status: ScholarshipStatus.Applied,
                link: '',
                notes: ''
            }]
        }));
        setIsScholarshipOpen(prev => [...prev, true]);
    }, []);

    const removeScholarship = useCallback((indexToRemove: number) => {
        setAppData(prev => ({
            ...prev,
            scholarships: (prev.scholarships || []).filter((_, index) => index !== indexToRemove)
        }));
        setIsScholarshipOpen(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const handleScholarshipChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppData(prev => {
            const updatedScholarships = [...(prev.scholarships || [])];
            const scholarshipToUpdate = { ...updatedScholarships[index] };

            if (name === 'amount') {
                (scholarshipToUpdate as any)[name] = value === '' ? 0 : parseFloat(value);
            } else {
                (scholarshipToUpdate as any)[name] = value;
            }

            updatedScholarships[index] = scholarshipToUpdate;
            return { ...prev, scholarships: updatedScholarships };
        });
    }, []);

    return {
        appData,
        setAppData,
        isFacultyOpen,
        setIsFacultyOpen,
        isRecommenderOpen,
        setIsRecommenderOpen,
        isScholarshipOpen,
        setIsScholarshipOpen,
        handleChange,
        handleNumericChange,
        handleCheckboxChange,
        handleDocumentChange,
        handleAttachFile,
        handleOpenFile,
        handleRemoveFile,
        handleFacultyChange,
        handleFacultyMarkdownChange,
        addFacultyContact,
        removeFacultyContact,
        handleFacultyFitChange,
        addPaperRead,
        removePaperRead,
        addCorrespondence,
        removeCorrespondence,
        addEssay,
        removeEssay,
        updateEssayStatus,
        addEssayDraft,
        removeEssayDraft,
        updateEssayDraft,
        handleAttachEssayDraftFile,
        handleOpenEssayDraftFile,
        handleRemoveEssayDraftFile,
        handleRecommenderChange,
        addRecommender,
        removeRecommender,
        addReminder,
        toggleReminder,
        deleteReminder,
        updateReminderDate,
        handleFinancialOfferChange,
        handleFinancialNumericChange,
        handleFinancialCheckboxChange,
        addScholarship,
        removeScholarship,
        handleScholarshipChange
    };
};

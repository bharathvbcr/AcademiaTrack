import React, { createContext, useContext } from 'react';
import { Application } from '../types';

interface ApplicationActionsContextType {
    openModal: (app: Application | null) => void;
    requestDelete: (id: string) => void;
    updateApplication: (app: Application) => void;
    duplicateApplication: (id: string) => void;
}

const ApplicationActionsContext = createContext<ApplicationActionsContextType | undefined>(undefined);

export const ApplicationActionsProvider: React.FC<{
    value: ApplicationActionsContextType;
    children: React.ReactNode;
}> = ({ value, children }) => (
    <ApplicationActionsContext.Provider value={value}>
        {children}
    </ApplicationActionsContext.Provider>
);

export const useApplicationActionsContext = (): ApplicationActionsContextType => {
    const context = useContext(ApplicationActionsContext);
    if (!context) {
        throw new Error('useApplicationActionsContext must be used within an ApplicationActionsProvider');
    }
    return context;
};

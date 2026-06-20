import React, { createContext, useContext } from 'react';

interface BulkSelectionContextType {
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onEnterSelectionMode: () => void;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | undefined>(undefined);

export const BulkSelectionProvider: React.FC<{
    value: BulkSelectionContextType;
    children: React.ReactNode;
}> = ({ value, children }) => (
    <BulkSelectionContext.Provider value={value}>
        {children}
    </BulkSelectionContext.Provider>
);

export const useBulkSelectionContext = (): BulkSelectionContextType => {
    const context = useContext(BulkSelectionContext);
    if (!context) {
        throw new Error('useBulkSelectionContext must be used within a BulkSelectionProvider');
    }
    return context;
};

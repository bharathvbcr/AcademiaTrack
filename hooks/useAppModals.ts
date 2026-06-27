import { useCallback, useState } from 'react';
import { Application } from '../types';

export const useAppModals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);

  const openModal = useCallback((app: Application | null) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingApplication(null);
  }, []);

  const openFacultyModal = useCallback(() => {
    setIsFacultyModalOpen(true);
  }, []);

  const closeFacultyModal = useCallback(() => {
    setIsFacultyModalOpen(false);
  }, []);

  return {
    isModalOpen,
    isFacultyModalOpen,
    editingApplication,
    openModal,
    closeModal,
    openFacultyModal,
    closeFacultyModal,
  };
};

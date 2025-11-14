import { useState } from 'react';
import { Application } from '../types';

export const useAppModals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);

  const openModal = (app: Application | null) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingApplication(null);
  };

  const openFacultyModal = () => {
    setIsFacultyModalOpen(true);
  };

  const closeFacultyModal = () => {
    setIsFacultyModalOpen(false);
  };

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

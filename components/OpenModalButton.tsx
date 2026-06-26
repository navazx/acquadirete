'use client';

import { ReactNode } from 'react';
import { useModal } from './ModalProvider';

interface OpenModalButtonProps {
  className?: string;
  children: ReactNode;
}

// Pulsante client riutilizzabile che apre la modale del modulo di contatto.
// Permette di usare il trigger della modale anche dentro pagine server.
export default function OpenModalButton({ className, children }: OpenModalButtonProps) {
  const { openModal } = useModal();
  return (
    <button onClick={openModal} className={className}>
      {children}
    </button>
  );
}

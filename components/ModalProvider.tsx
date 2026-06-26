'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import ContactForm from './ContactForm';

interface ModalContextValue {
  openModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  openModal: () => {},
  closeModal: () => {},
});

// Hook usato da qualsiasi pulsante "Sopralluogo gratuito" in tutto il sito.
export const useModal = () => useContext(ModalContext);

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      {/* Overlay Analysis Proposal Modal (Pianifica Preventivo Gratuito) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-55 overflow-y-auto" id="analysis-modal">
            {/* Backdrop lock */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={closeModal}
            ></div>

            {/* Content centered container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <motion.div
                className="relative bg-white rounded-xl overflow-hidden shadow-xl max-w-lg w-full text-left border border-slate-200"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {/* Close Button X */}
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-200 z-10"
                >
                  <X size={15} />
                </button>

                {/* Main Content scrollable Wrapper */}
                <div className="p-1">
                  <ContactForm initialService="test_acqua" />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

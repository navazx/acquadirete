'use client';

import { motion } from 'motion/react';

// Il template viene rimontato a ogni cambio pagina: riproduce la transizione
// di entrata che nella SPA originale era gestita da AnimatePresence.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

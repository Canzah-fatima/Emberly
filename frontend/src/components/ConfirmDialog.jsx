import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={description ? "confirm-dialog-description" : undefined}
          className="w-full max-w-sm overflow-hidden rounded-[24px] border border-emberly-ivory/10 bg-emberly-navy-deep p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,.4)]"
        >
          <h3 id="confirm-dialog-title" className="font-display text-lg font-semibold mb-1.5">{title}</h3>
          {description && <p id="confirm-dialog-description" className="text-sm text-emberly-ivory/45 mb-5">{description}</p>}
          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirm}
              className={`w-full py-2.5 rounded-full text-sm font-medium transition-colors ${
                destructive
                  ? 'bg-emberly-crimson-dark text-emberly-ivory hover:bg-emberly-crimson'
                  : 'bg-emberly-crimson text-emberly-ivory hover:bg-emberly-crimson-dark'
              }`}
            >
              {confirmLabel}
            </button>
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="w-full py-2.5 rounded-full text-sm font-medium border border-emberly-ivory/12 hover:border-emberly-blue transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

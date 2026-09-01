import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const REASONS = ['Spam', 'Harassment', 'Hate speech', 'Violence', 'Nudity', 'False information', 'Scam', 'Other'];

export default function ReportModal({ onClose }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');

  const submit = () => {
    setStep(3);
    showToast("Thanks — we'll take a look");
    window.setTimeout(onClose, 1400);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm overflow-hidden rounded-[24px] border border-emberly-ivory/10 bg-emberly-navy-deep p-6 shadow-[0_30px_90px_rgba(0,0,0,.4)]"
        >
          {step === 1 && (
            <>
              <h3 className="font-display text-lg font-semibold mb-4">What would you like to report?</h3>
              <div className="flex flex-col gap-1">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setReason(r); setStep(2); }}
                    className="text-left px-3 py-2.5 rounded-lg hover:bg-emberly-ivory/5 transition-colors text-sm"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="mt-3 text-sm text-emberly-ivory/45 hover:text-emberly-ivory">Cancel</button>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-display text-lg font-semibold mb-1">Tell us more</h3>
              <p className="text-sm text-emberly-ivory/45 mb-4">Reporting for: {reason}. Anything else we should know? (optional)</p>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Additional details…"
                className="w-full bg-transparent border border-emberly-ivory/12 rounded-lg px-3 py-2 text-sm outline-none focus:border-emberly-blue resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={submit} className="flex-1 bg-emberly-crimson text-emberly-ivory font-medium py-2.5 rounded-full hover:bg-emberly-crimson-dark transition-colors text-sm">
                  Submit report
                </button>
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-full border border-emberly-ivory/12 text-sm hover:border-emberly-blue transition-colors">
                  Back
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <p className="text-center text-sm py-6">Report submitted. Thank you for helping keep Emberly safe.</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

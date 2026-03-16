import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

const focusableSelectors = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onCancel,
  onConfirm,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = panelRef.current?.querySelectorAll(focusableSelectors);
    const firstFocusable = focusable?.[0];
    firstFocusable?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isConfirming) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = panelRef.current?.querySelectorAll(focusableSelectors);
      if (!focusableElements?.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConfirming, isOpen, onCancel]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-200"
        aria-label="Close dialog"
        onClick={() => {
          if (!isConfirming) {
            onCancel();
          }
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(26,20,17,0.96),rgba(13,10,9,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] transition-transform duration-200"
      >
        <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(210,109,71,0.12),transparent_42%)] pointer-events-none" />
        <div className="relative">
          <h2 id="confirm-modal-title" className="text-2xl font-semibold text-white">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/65">{message}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              className="btn-outline rounded-full px-5"
              onClick={onCancel}
              disabled={isConfirming}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              className="rounded-full border border-red-400/28 bg-red-500/10 px-5 text-red-100 transition-all duration-200 hover:border-red-300/40 hover:bg-red-500/14 hover:text-white hover:shadow-[0_16px_34px_rgba(239,68,68,0.16)]"
              onClick={onConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? 'Deleting...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from '@/lib/formDraftStorage';

interface UseFormDraftOptions<T> {
  storageKey: string;
  open: boolean;
  enabled: boolean;
  data: T;
  hasContent: (data: T) => boolean;
  debounceMs?: number;
}

export function useFormDraft<T>({
  storageKey,
  open,
  enabled,
  data,
  hasContent,
  debounceMs = 400,
}: UseFormDraftOptions<T>) {
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [draftResolved, setDraftResolved] = useState(false);
  const pendingDraftRef = useRef<T | null>(null);

  useEffect(() => {
    if (!open) {
      setShowRestorePrompt(false);
      setDraftResolved(false);
      pendingDraftRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!enabled) {
      setDraftResolved(true);
      return;
    }

    const draft = loadDraft<T>(storageKey);
    if (draft && hasContent(draft)) {
      pendingDraftRef.current = draft;
      setShowRestorePrompt(true);
      setDraftResolved(false);
    } else {
      pendingDraftRef.current = null;
      setShowRestorePrompt(false);
      setDraftResolved(true);
    }
  }, [open, enabled, storageKey, hasContent]);

  useEffect(() => {
    if (!open || !enabled || !draftResolved || showRestorePrompt) return;
    if (!hasContent(data)) return;

    const timer = setTimeout(() => {
      saveDraft(storageKey, data);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [open, enabled, draftResolved, showRestorePrompt, data, storageKey, debounceMs, hasContent]);

  const restoreDraft = useCallback((): T | null => {
    const draft = pendingDraftRef.current;
    pendingDraftRef.current = null;
    setShowRestorePrompt(false);
    setDraftResolved(true);
    return draft;
  }, []);

  const discardDraft = useCallback(() => {
    clearDraft(storageKey);
    pendingDraftRef.current = null;
    setShowRestorePrompt(false);
    setDraftResolved(true);
  }, [storageKey]);

  const clearSavedDraft = useCallback(() => {
    clearDraft(storageKey);
  }, [storageKey]);

  return {
    showRestorePrompt,
    draftResolved,
    restoreDraft,
    discardDraft,
    clearSavedDraft,
  };
}

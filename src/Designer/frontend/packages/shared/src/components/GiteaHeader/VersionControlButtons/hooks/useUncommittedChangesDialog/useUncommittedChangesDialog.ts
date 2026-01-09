import { useState, useEffect } from 'react';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

export interface UseUncommittedChangesDialogResult {
  showUncommittedChangesDialog: boolean;
  setShowUncommittedChangesDialog: (show: boolean) => void;
  uncommittedChangesError: UncommittedChangesError | undefined;
}

export function useUncommittedChangesDialog(
  errors: (UncommittedChangesError | null)[],
): UseUncommittedChangesDialogResult {
  const [showUncommittedChangesDialog, setShowUncommittedChangesDialog] = useState(false);

  const uncommittedChangesError = getFirstUncommittedChangesError(errors);

  useEffect(() => {
    if (uncommittedChangesError) {
      setShowUncommittedChangesDialog(true);
    }
  }, [uncommittedChangesError]);

  return {
    showUncommittedChangesDialog,
    setShowUncommittedChangesDialog,
    uncommittedChangesError,
  };
}

function getFirstUncommittedChangesError(
  array: (UncommittedChangesError | null)[],
): UncommittedChangesError | undefined {
  return array.find((element) => element !== null);
}

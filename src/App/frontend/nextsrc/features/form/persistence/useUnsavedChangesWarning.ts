import { useEffect } from 'react';

/**
 * Shows a browser "Leave site?" dialog when the user tries to close/navigate
 * away while `data-unsaved-changes` is set on document.body.
 */
export function useUnsavedChangesWarning() {
  useEffect(() => {
    const updateBeforeUnload = () => {
      window.onbeforeunload = document.body.hasAttribute('data-unsaved-changes') ? () => true : null;
    };

    updateBeforeUnload();

    const observer = new MutationObserver(() => updateBeforeUnload());
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-unsaved-changes'] });

    return () => {
      observer.disconnect();
      window.onbeforeunload = null;
    };
  }, []);
}

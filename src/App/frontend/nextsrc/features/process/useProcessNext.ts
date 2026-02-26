import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { ProcessApi } from 'nextsrc/core/apiClient/processApi';
import { routeBuilders } from 'nextsrc/routesBuilder';

const UNSAVED_POLL_INTERVAL = 50;
const UNSAVED_POLL_TIMEOUT = 10_000;

function waitForSaveFlush(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (!document.body.hasAttribute('data-unsaved-changes')) {
        resolve();
        return;
      }
      if (Date.now() - start > UNSAVED_POLL_TIMEOUT) {
        reject(new Error('Timed out waiting for unsaved changes to flush'));
        return;
      }
      setTimeout(check, UNSAVED_POLL_INTERVAL);
    };
    check();
  });
}

interface UseProcessNextOptions {
  instanceOwnerPartyId: string;
  instanceGuid: string;
  action?: string;
  language?: string;
}

export function useProcessNext({ instanceOwnerPartyId, instanceGuid, action, language }: UseProcessNextOptions) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await waitForSaveFlush();

      const process = await ProcessApi.processNext({
        instanceOwnerPartyId,
        instanceGuid,
        action,
        language,
      });

      if (process.ended || !process.currentTask) {
        navigate(routeBuilders.processEnd({ instanceOwnerPartyId, instanceGuid }));
      } else {
        navigate(
          routeBuilders.task({
            instanceOwnerPartyId,
            instanceGuid,
            taskId: process.currentTask.elementId,
          }),
        );
      }
    } catch (err) {
      const processError = err instanceof Error ? err : new Error('Process next failed');
      setError(processError);
      console.error('[useProcessNext] Failed:', processError);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, instanceOwnerPartyId, instanceGuid, action, language, navigate]);

  return { submit, isSubmitting, error };
}

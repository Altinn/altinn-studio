import React, { useCallback, useEffect, useRef } from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useCurrentInstance } from 'src/core/queries/instance';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useOptimisticallyUpdateProcess } from 'src/features/instance/useProcessQuery';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const previousProcess = useCurrentInstance()?.process;
  const navigateToTask = useNavigateToTask();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const optimisticallyUpdateProcess = useOptimisticallyUpdateProcess();
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;

  const callback = useCallback(async () => {
    const result = await reFetchInstanceData();
    const process = result.data?.process;
    if (!process) {
      return;
    }

    let navigateTo: undefined | string;
    if (process.ended) {
      navigateTo = TaskKeys.ProcessEnd;
    } else if (
      process.currentTask?.elementId &&
      process.currentTask.elementId !== previousProcess?.currentTask?.elementId
    ) {
      navigateTo = process.currentTask.elementId;
    }

    if (navigateTo) {
      optimisticallyUpdateProcess(process);
      navigateToTask(navigateTo);
    }
  }, [navigateToTask, optimisticallyUpdateProcess, previousProcess?.currentTask?.elementId, reFetchInstanceData]);

  // Continually re-fetch process data while the user is on the feedback page
  useBackoff(callback);

  return (
    <div id='FeedbackContainer'>
      <title>{`${getPageTitle(appName, langAsString('feedback.title'), appOwner)}`}</title>
      <LangAsParagraph id='feedback.title' />
      <LangAsParagraph id='feedback.body' />
      <ReadyForPrint type='load' />
    </div>
  );
}

function useBackoff(callback: () => Promise<void>) {
  // The backoff algorithm is used to check the process data, and slow down the requests after a while.
  // At first, it starts off once a second (every 1000ms) for 10 seconds.
  // After that, it slows down by one more second for every request.
  // Once it reaches 20 attempts, it will reach the max delay of 30 seconds between each request.
  const attempts = useRef(0);

  useEffect(() => {
    let shouldContinue = true;
    function continueCalling() {
      const backoff = attempts.current < 10 ? 1000 : Math.min(30000, 1000 + (attempts.current - 10) * 1000);
      setTimeout(() => {
        if (!shouldContinue) {
          return;
        }
        callback().then();
        attempts.current++;
        shouldContinue && continueCalling();
      }, backoff);
    }

    continueCalling();

    return () => {
      shouldContinue = false;
    };
  }, [callback]);
}

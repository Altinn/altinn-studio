import React, { useCallback, useEffect, useRef } from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const { refetch: reFetchProcessData, data: previousData } = useProcessQuery();
  const navigateToTask = useNavigateToTask();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const optimisticallyUpdateProcess = useOptimisticallyUpdateProcess();
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;

  const callback = useCallback(async () => {
    const result = await reFetchProcessData();
    if (!result.data) {
      return;
    }

    let navigateTo: undefined | string;
    if (result.data.ended) {
      navigateTo = TaskKeys.ProcessEnd;
    } else if (
      result.data.currentTask?.elementId &&
      result.data.currentTask.elementId !== previousData?.currentTask?.elementId
    ) {
      navigateTo = result.data.currentTask.elementId;
    }

    if (navigateTo) {
      optimisticallyUpdateProcess(result.data);
      await reFetchInstanceData();
      navigateToTask(navigateTo);
    }
  }, [
    navigateToTask,
    optimisticallyUpdateProcess,
    previousData?.currentTask?.elementId,
    reFetchInstanceData,
    reFetchProcessData,
  ]);

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

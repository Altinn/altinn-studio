import React, { useCallback, useEffect, useRef } from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { InstanceApi } from 'src/core/api-client/instance.api';
import { useCurrentInstance } from 'src/core/queries/instance';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useInstanceDataQueryArgs } from 'src/features/instance/InstanceContext';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { TaskKeys } from 'src/routesBuilder';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const previousProcess = useCurrentInstance()?.process;
  const navigateToTask = useNavigateToTask();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();

  const callback = useCallback(async () => {
    if (!instanceOwnerPartyId || !instanceGuid) {
      return;
    }

    // Fetch instance data directly from the API instead of through React Query.
    // This avoids updating the shared query cache, which would cause ProcessWrapper
    // to briefly see new process data while the URL still points to the feedback task,
    // resulting in a flash of the NavigationError.
    const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });
    const process = instance.process;

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
      navigateToTask(navigateTo);
    }
  }, [navigateToTask, previousProcess?.currentTask?.elementId, instanceOwnerPartyId, instanceGuid]);

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

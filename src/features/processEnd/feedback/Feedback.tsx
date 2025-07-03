import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const { refetch: reFetchProcessData } = useProcessQuery();
  const currentTask = useProcessQuery().data?.currentTask?.elementId;
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  // Continually re-fetch process data while the user is on the feedback page
  useBackoff({
    enabled: !!currentTask && !!reFetchProcessData,
    callback: async () => void (await (reFetchProcessData && reFetchProcessData())),
  });

  return (
    <div id='FeedbackContainer'>
      <Helmet>
        <title>{`${getPageTitle(appName, langAsString('feedback.title'), appOwner)}`}</title>
      </Helmet>
      <LangAsParagraph id='feedback.title' />
      <LangAsParagraph id='feedback.body' />
      <ReadyForPrint type='load' />
    </div>
  );
}

function useBackoff({ enabled, callback }: { enabled: boolean; callback: () => Promise<void> }) {
  // The backoff algorithm is used to check the process data, and slow down the requests after a while.
  // At first, it starts off once a second (every 1000ms) for 10 seconds.
  // After that, it slows down by one more second for every request.
  // Once it reaches 20 attempts, it will reach the max delay of 30 seconds between each request.
  const attempts = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return () => {};
    }

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
  }, [callback, enabled]);
}

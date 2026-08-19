import React from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useFollowProcess } from 'src/features/process/useFollowProcess';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  // Continually re-fetch process data while the user is on the feedback page, and navigate
  // forward when the process moves on.
  useFollowProcess();

  return (
    <div id='FeedbackContainer'>
      <title>{`${getPageTitle(appName, langAsString('feedback.title'), appOwner)}`}</title>
      <LangAsParagraph id='feedback.title' />
      <LangAsParagraph id='feedback.body' />
      <ReadyForPrint type='load' />
    </div>
  );
}

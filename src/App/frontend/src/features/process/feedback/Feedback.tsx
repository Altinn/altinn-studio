import React from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getPageTitle } from 'src/utils/getPageTitle';

export function Feedback() {
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  // ProcessWrapper uses useFollowProcess to watch the process and redirect when it advances.
  return (
    <div id='FeedbackContainer'>
      <title>{`${getPageTitle(appName, langAsString('feedback.title'), appOwner)}`}</title>
      <LangAsParagraph id='feedback.title' />
      <LangAsParagraph id='feedback.body' />
      <ReadyForPrint type='load' />
    </div>
  );
}

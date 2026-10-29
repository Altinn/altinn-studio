import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { formatDateLocale } from 'src/utils/dateUtils';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { InstantiationClosedReason } from 'src/features/instantiate/instantiationClosed';

/**
 * Explains why the service cannot be started, as a text fragment for use in error reports and on the error page.
 */
export function InstantiationClosedText({ reason }: { reason: InstantiationClosedReason }) {
  const language = useCurrentLanguage();

  if (reason.reason === 'notYetOpen') {
    return (
      <Lang
        id='instantiate.not_yet_open_error_text'
        params={[formatDateLocale(language, reason.opensAt, 'dd.MM.yyyy HH:mm')]}
      />
    );
  }

  return <Lang id='instantiate.closed_error_text' />;
}

export function InstantiationClosedError({ reason }: { reason: InstantiationClosedReason }) {
  const { langAsString } = useLanguage();

  return (
    <InstantiationErrorPage
      title={
        <Lang
          id={
            reason.reason === 'notYetOpen' ? 'instantiate.not_yet_open_error_title' : 'instantiate.closed_error_title'
          }
        />
      }
      content={<InstantiationClosedText reason={reason} />}
      showContactInfo={true}
      statusCode={`${langAsString('party_selection.error_caption_prefix')} ${HttpStatusCodes.Gone}`}
    />
  );
}

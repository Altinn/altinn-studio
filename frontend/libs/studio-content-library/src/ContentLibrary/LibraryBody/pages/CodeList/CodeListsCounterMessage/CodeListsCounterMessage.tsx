import React from 'react';
import { StudioParagraph } from '@studio/components';
import { Trans } from 'react-i18next';

export type CodeListsCounterMessageProps = {
  codeListsCount: number;
};

export function CodeListsCounterMessage({
  codeListsCount,
}: CodeListsCounterMessageProps): React.ReactElement {
  const onlyOneCodeListExists = codeListsCount === 1;
  return (
    <StudioParagraph size='sm'>
      <Trans
        i18nKey={
          onlyOneCodeListExists
            ? 'app_content_library.code_lists.code_lists_count_info_single'
            : 'app_content_library.code_lists.code_lists_count_info_plural'
        }
        values={{ codeListsCount }}
        components={{ bold: <strong /> }}
      />
    </StudioParagraph>
  );
}

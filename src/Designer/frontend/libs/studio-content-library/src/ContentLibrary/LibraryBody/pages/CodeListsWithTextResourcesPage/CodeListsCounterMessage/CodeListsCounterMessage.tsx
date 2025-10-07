import React from 'react';
import { StudioParagraph } from '@studio/components';
import { Trans } from 'react-i18next';

export type CodeListsCounterMessageProps = {
  codeListsCount: number;
};

export function CodeListsCounterMessage({
  codeListsCount,
}: CodeListsCounterMessageProps): React.ReactElement {
  let codeListsCounterTextKey =
    'app_content_library.code_lists_with_text_resources.code_lists_count_info_plural';

  switch (codeListsCount) {
    case 0: {
      codeListsCounterTextKey =
        'app_content_library.code_lists_with_text_resources.code_lists_count_info_none';
      break;
    }
    case 1: {
      codeListsCounterTextKey =
        'app_content_library.code_lists_with_text_resources.code_lists_count_info_single';
      break;
    }
  }

  return (
    <StudioParagraph>
      <Trans
        i18nKey={codeListsCounterTextKey}
        values={{ codeListsCount }}
        components={{ bold: <strong /> }}
      />
    </StudioParagraph>
  );
}

import React from 'react';
import { StudioParagraph } from '@studio/components';
import { Trans } from 'react-i18next';

export type CodeListsCounterMessageProps = {
  amountCodeLists: number;
};

export function CodeListsCounterMessage({
  amountCodeLists,
}: CodeListsCounterMessageProps): React.ReactElement {
  const onlyOneCodeListExists = amountCodeLists === 1;
  return (
    <StudioParagraph size='sm'>
      <Trans
        i18nKey={
          onlyOneCodeListExists
            ? 'app_content_library.code_lists.amount_code_lists_info_single'
            : 'app_content_library.code_lists.amount_code_lists_info_plural'
        }
        values={{ amountCodeLists }}
        components={{ bold: <strong /> }}
      />
    </StudioParagraph>
  );
}

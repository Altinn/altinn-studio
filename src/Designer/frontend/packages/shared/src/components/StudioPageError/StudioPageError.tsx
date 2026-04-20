import type { ReactElement } from 'react';
import {
  StudioPageError as StudioPageErrorBase,
  StudioParagraph,
  StudioLink,
} from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';

export function StudioPageError(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioPageErrorBase
      title={t('general.page_error_title')}
      message={
        <StudioParagraph>
          <Trans
            i18nKey={'general.page_error_message'}
            components={{
              a: <StudioLink href='/info/contact'> </StudioLink>,
            }}
          />
        </StudioParagraph>
      }
    />
  );
}

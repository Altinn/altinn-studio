import type { ReactElement } from 'react';
import { StudioAlert, StudioCenter, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const NoOrgSelected = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioAlert>
        <StudioParagraph data-size='md'>{t('settings.user.coming_soon')}</StudioParagraph>
        <StudioParagraph data-size='md'>{t('settings.user.coming_soon_use_org')}</StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
};

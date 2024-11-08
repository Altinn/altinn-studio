import React from 'react';
import { TabContent } from '../../TabContent';
import { ansattportenLoginPath } from 'app-shared/api/paths';
import { StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const Maskinporten = (): React.ReactElement => {
  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = ansattportenLoginPath();
  };

  return (
    <TabContent>
      <StudioHeading level={2} size='sm' spacing>
        {t('settings_modal.maskinporten_tab_title')}
      </StudioHeading>
      <StudioParagraph spacing>{t('settings_modal.maskinporten_tab_description')}</StudioParagraph>
      <StudioButton onClick={handleLoginWithAnsattporten}>
        {t('settings_modal.maskinporten_tab_login_with_ansattporten')}
      </StudioButton>
    </TabContent>
  );
};

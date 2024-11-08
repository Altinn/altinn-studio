import React from 'react';
<<<<<<< HEAD
import { useTranslation } from 'react-i18next';
import { TabContent } from '../../TabContent';
import { StudioButton, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { useIsLoggedInWithAnsattportenQuery } from '../../../../../../../../hooks/queries/useIsLoggedInWithAnsattportenQuery';

export const Maskinporten = (): React.ReactElement => {
  const { data: isLoggedInWithAnsattporten, isPending: isPendingAuthStatus } =
    useIsLoggedInWithAnsattportenQuery();

  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    console.log('Will be implemented in next iteration when backend is ready');
  };

  if (isPendingAuthStatus) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (isLoggedInWithAnsattporten) {
    return <div>View when logged in comes here</div>;
  }

=======
import { TabContent } from '../../TabContent';
import { ansattportenLoginPath } from 'app-shared/api/paths';
import { StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const Maskinporten = (): React.ReactElement => {
  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = ansattportenLoginPath();
  };

>>>>>>> 1f588e11a (feat: context based login with ansattporten)
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

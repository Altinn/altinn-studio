import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';

export function NoOrgMembershipAlert(): ReactElement {
  const { t } = useTranslation();

  return (
    <StudioAlert data-color='warning'>
      <StudioHeading data-size='2xs' level={4}>
        {t('app_settings.maskinporten_no_org_membership_title')}
      </StudioHeading>
      <StudioParagraph>
        {t('app_settings.maskinporten_no_org_membership_description')}
      </StudioParagraph>
    </StudioAlert>
  );
}

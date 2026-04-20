import type { ReactElement } from 'react';
import { StudioAlert, StudioCenter, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const NoOrgSelected = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioAlert>
        <StudioParagraph data-size='md'>{t('admin.apps.alert_no_org_selected')}</StudioParagraph>
        <StudioParagraph data-size='md'>
          {t('admin.apps.alert_no_org_selected_no_access')}
        </StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
};

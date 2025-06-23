import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import React from 'react';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Paragraph } from '@digdir/designsystemet-react';
import { FormLayoutWarning } from './FormLayoutWarning';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { AddItem } from './AddItem';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';

export interface FormLayoutProps {
  layout: IInternalLayout;
  isInvalid: boolean;
  duplicateComponents?: string[];
}

export const FormLayout = ({ layout, isInvalid, duplicateComponents }: FormLayoutProps) => {
  if (isInvalid) {
    return <FormLayoutWarning layout={layout} />;
  }

  const hasNoChildComponents: boolean = Object.entries(layout.components).length === 0;

  return (
    <>
      {hasMultiPageGroup(layout) && <MultiPageWarning />}
      <FormTree duplicateComponents={duplicateComponents} layout={layout} />
      {/** The following check and component are added as part of a live user test behind a feature flag. Can be removed if we decide not to use after user test.*/}
      {shouldDisplayFeature(FeatureFlag.AddComponentModal) && hasNoChildComponents && (
        <AddItem containerId={BASE_CONTAINER_ID} layout={layout} />
      )}
    </>
  );
};

const MultiPageWarning = () => {
  const { t } = useTranslation();
  return (
    <Alert severity='warning'>
      <Paragraph size='small'>{t('ux_editor.multi_page_warning')}</Paragraph>
    </Alert>
  );
};

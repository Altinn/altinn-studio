import { IInternalLayout } from '../../types/global';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { FormTree } from './FormTree';
import { RenderedFormContainer } from './RenderedFormContainer';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import React from 'react';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Paragraph } from '@digdir/design-system-react';

export interface FormLayoutProps {
  layout: IInternalLayout;
}

export const FormLayout = ({ layout }: FormLayoutProps) => {
  const { order, containers, components } = layout;

  const renderForm = () =>
    shouldDisplayFeature('formTree') ? (
      <FormTree layout={layout} />
    ) : (
      <RenderedFormContainer
        containerId={BASE_CONTAINER_ID}
        formLayoutOrder={order}
        formDesignerContainers={containers}
        formDesignerComponents={components}
      />
    );

  return (
    <>
      {hasMultiPageGroup(layout) && <MultiPageWarning />}
      {renderForm()}
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

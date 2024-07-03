import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import React from 'react';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Paragraph } from '@digdir/design-system-react';
import { FormLayoutWarning } from './FormLayoutWarning';

export interface FormLayoutProps {
  layout: IInternalLayout;
  isValid: boolean;
  duplicateComponents?: string[];
}

export const FormLayout = ({ layout, isValid, duplicateComponents }: FormLayoutProps) => {
  if (!isValid) {
    return <FormLayoutWarning layout={layout} />;
  }
  return (
    <>
      {hasMultiPageGroup(layout) && <MultiPageWarning />}
      <FormTree duplicateComponents={duplicateComponents} layout={layout} />
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

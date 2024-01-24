import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import React from 'react';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Paragraph } from '@digdir/design-system-react';

export interface FormLayoutProps {
  layout: IInternalLayout;
}

export const FormLayout = ({ layout }: FormLayoutProps) => (
  <>
    {hasMultiPageGroup(layout) && <MultiPageWarning />}
    <FormTree layout={layout} />
  </>
);

const MultiPageWarning = () => {
  const { t } = useTranslation();
  return (
    <Alert severity='warning'>
      <Paragraph size='small'>{t('ux_editor.multi_page_warning')}</Paragraph>
    </Alert>
  );
};

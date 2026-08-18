import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/designsystemet-react';
import { StudioParagraph } from '@studio/components';

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
      <StudioParagraph data-size='sm'>{t('ux_editor.multi_page_warning')}</StudioParagraph>
    </Alert>
  );
};

import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import { hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { StudioParagraph, StudioAlert } from '@studio/components';

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
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>{t('ux_editor.multi_page_warning')}</StudioParagraph>
    </StudioAlert>
  );
};

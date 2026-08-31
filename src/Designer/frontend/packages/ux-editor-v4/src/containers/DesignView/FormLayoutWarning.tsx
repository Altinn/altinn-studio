import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import classes from './FormLayoutWarning.module.css';
import { StudioParagraph } from '@studio/components';

interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout).join(', ');
  const { t } = useTranslation();
  return (
    <div className={classes.warningWrapper}>
      <StudioParagraph data-size='sm'>
        {t('ux_editor.formLayout.warning_duplicates')}
        <span className={classes.duplicatedId}> {duplicatedIds}</span>
      </StudioParagraph>
      <StudioParagraph data-size='sm'>
        {t('ux_editor.formLayout.warning_duplicates.cannot_publish')}
      </StudioParagraph>
    </div>
  );
};

import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';
import { StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './FormLayoutWarning.module.css';

interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout).join(', ');
  const { t } = useTranslation();
  return (
    <div className={classes.warningWrapper}>
      <StudioParagraph>
        {t('ux_editor.formLayout.warning_duplicates')}
        <span className={classes.duplicatedId}> {duplicatedIds}</span>
      </StudioParagraph>
      <StudioParagraph>
        {t('ux_editor.formLayout.warning_duplicates.cannot_publish')}
      </StudioParagraph>
    </div>
  );
};

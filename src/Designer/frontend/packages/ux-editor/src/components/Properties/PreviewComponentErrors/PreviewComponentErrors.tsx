import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';
import { useAppContext } from '../../../hooks/useAppContext';
import classes from './PreviewComponentErrors.module.css';

export type PreviewComponentErrorsProps = {
  componentId: string;
};

/** The errors that the app frontend in preview found in the component's configuration. */
export const PreviewComponentErrors = ({
  componentId,
}: PreviewComponentErrorsProps): ReactElement | null => {
  const { t } = useTranslation();
  const { previewComponentErrors } = useAppContext();
  const errors = previewComponentErrors.get(componentId);
  if (!errors) return null;

  return (
    <StudioAlert data-color='danger' className={classes.alert}>
      <StudioHeading level={3} data-size='2xs'>
        {t('ux_editor.preview.component_has_errors')}
      </StudioHeading>
      <ul className={classes.errors}>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <StudioParagraph data-size='sm'>
        {t('ux_editor.preview.component_errors_hidden')}
      </StudioParagraph>
    </StudioAlert>
  );
};

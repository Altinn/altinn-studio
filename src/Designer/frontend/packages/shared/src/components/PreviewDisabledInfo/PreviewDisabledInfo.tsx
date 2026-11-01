import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert } from '@studio/components';

export type PreviewDisabledInfoProps = {
  className?: string;
};

export const PreviewDisabledInfo = ({ className }: PreviewDisabledInfoProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='info' className={className}>
      {t('preview.temporarily_disabled')}
    </StudioAlert>
  );
};

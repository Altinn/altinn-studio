import React from 'react';
import { Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type SafeErrorViewProps = {
  heading?: string;
  title: string;
  message: string | React.ReactNode;
};

export const SafeErrorView = ({
  heading,
  title,
  message,
}: SafeErrorViewProps): React.ReactElement => {
  const { t } = useTranslation();
  const handleReloadPage = () => window.location.reload();

  return (
    <>
      {heading && (
        <Heading level={2} size='small' spacing>
          {heading}
        </Heading>
      )}
      <Alert severity='danger'>
        <Heading level={3} size='small' spacing>
          {title}
        </Heading>
        <Paragraph spacing>{message}</Paragraph>
        <div>
          <StudioButton onClick={handleReloadPage}>{t('general.reload')}</StudioButton>
        </div>
      </Alert>
    </>
  );
};

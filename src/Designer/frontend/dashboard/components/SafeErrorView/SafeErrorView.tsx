import React from 'react';
import { StudioButton, StudioError, StudioParagraph, StudioHeading } from '@studio/components';
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
        <StudioHeading level={2} data-size='md' spacing>
          {heading}
        </StudioHeading>
      )}
      <StudioError>
        <StudioHeading level={3} data-size='md' spacing>
          {title}
        </StudioHeading>
        <StudioParagraph spacing>{message}</StudioParagraph>
        <div>
          <StudioButton data-color='accent' onClick={handleReloadPage}>
            {t('general.reload')}
          </StudioButton>
        </div>
      </StudioError>
    </>
  );
};

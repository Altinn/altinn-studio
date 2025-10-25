import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioLinkButton } from '@studio/components';
import { ExternalLinkIcon } from '@studio/icons';
import classes from './PreviewActions.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSearchParams } from 'react-router-dom';

export type PreviewActionsProps = {
  toggleIcon: React.ReactNode;
  toggleTitle?: string;
  className: string;
  onCollapseToggle: () => void;
};

export const PreviewActions = ({
  toggleIcon,
  toggleTitle,
  className,
  onCollapseToggle,
}: PreviewActionsProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const packagesRouter = new PackagesRouter({ org, app });
  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');
  const previewLinkQueryParams = layout ? `?layout=${layout}` : '';
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${previewLinkQueryParams}`;

  return (
    <div className={className}>
      <StudioButton
        variant='tertiary'
        data-color='neutral'
        icon={toggleIcon}
        title={toggleTitle}
        onClick={onCollapseToggle}
      />
      <StudioLinkButton
        variant='tertiary'
        className={classes.previewInNewTabButton}
        title={t('ux_editor.open_preview_in_new_tab')}
        href={previewLink}
        target='_blank'
      >
        <ExternalLinkIcon aria-hidden />
      </StudioLinkButton>
    </div>
  );
};

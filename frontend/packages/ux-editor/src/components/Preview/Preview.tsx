import React, { useEffect, useState } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppContext, useSelectedTaskId } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/designsystemet-react';
import { StudioButton, StudioCenter } from '@studio/components';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { ArrowRightIcon } from '@studio/icons';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';

export const Preview = () => {
  const { t } = useTranslation();
  const [isPreviewHidden, setIsPreviewHidden] = useState<boolean>(false);
  const { selectedFormLayoutName } = useAppContext();
  const noPageSelected =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  const togglePreview = (): void => {
    setIsPreviewHidden((prev: boolean) => !prev);
  };

  return isPreviewHidden ? (
    <StudioButton
      size='small'
      variant='secondary'
      className={classes.openPreviewButton}
      onClick={togglePreview}
    >
      {t('ux_editor.open_preview')}
    </StudioButton>
  ) : (
    <div className={classes.root}>
      <StudioButton
        size='small'
        variant='tertiary'
        icon={<ArrowRightIcon aria-hidden />}
        title={t('ux_editor.close_preview')}
        className={classes.closePreviewButton}
        onClick={togglePreview}
      />
      {noPageSelected ? <NoSelectedPageMessage /> : <PreviewFrame />}
    </div>
  );
};

// Message to display when no page is selected
const NoSelectedPageMessage = () => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <Paragraph size='medium'>{t('ux_editor.no_components_selected')}</Paragraph>
    </StudioCenter>
  );
};

// The actual preview frame that displays the selected page
const PreviewFrame = () => {
  const { org, app } = useStudioEnvironmentParams();
  const [viewportToSimulate, setViewportToSimulate] = useState<SupportedView>('desktop');
  const { previewIframeRef, selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const taskId = useSelectedTaskId(selectedFormLayoutSetName);
  const { t } = useTranslation();

  const { shouldReloadPreview, previewHasLoaded } = useAppContext();
  const checksum = useChecksum(shouldReloadPreview);

  useEffect(() => {
    return () => {
      previewIframeRef.current = null;
    };
  }, [previewIframeRef]);

  return (
    <div className={classes.root}>
      <ViewToggler onChange={setViewportToSimulate} />
      <div className={classes.previewArea}>
        <div className={classes.iframeContainer}>
          <iframe
            key={checksum}
            ref={previewIframeRef}
            className={cn(classes.iframe, classes[viewportToSimulate])}
            title={t('ux_editor.preview')}
            src={previewPage(org, app, selectedFormLayoutSetName, taskId, selectedFormLayoutName)}
            onLoad={previewHasLoaded}
          />
        </div>
        <PreviewLimitationsInfo />
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import classes from './Preview.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppContext, useSelectedFormLayoutName } from '../../hooks';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/design-system-react';
import { StudioButton, StudioCenter } from '@studio/components';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { ArrowRightIcon } from '@studio/icons';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';

export const Preview = () => {
  const { t } = useTranslation();
  const [isPreviewHidden, setIsPreviewHidden] = useState<boolean>(false);
  const { selectedFormLayoutName } = useSelectedFormLayoutName();
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
  const { org, app } = useStudioUrlParams();
  const [viewportToSimulate, setViewportToSimulate] = useState<SupportedView>('desktop');
  const { previewIframeRef, refetchLayouts, refetchLayoutSettings, reloadPreview } =
    useAppContext();
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useSelectedFormLayoutName();

  useUpdate(() => {
    const reload = async () => {
      await refetchLayouts();
      await refetchLayoutSettings();
      reloadPreview(selectedFormLayoutName);
    };
    reload();
  }, [previewIframeRef, selectedFormLayoutName]);

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
            ref={previewIframeRef}
            className={cn(classes.iframe, classes[viewportToSimulate])}
            title={t('ux_editor.preview')}
            src={previewPage(org, app, selectedFormLayoutName)}
          />
        </div>
        <PreviewLimitationsInfo />
      </div>
    </div>
  );
};

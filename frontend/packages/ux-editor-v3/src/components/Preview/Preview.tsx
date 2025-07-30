import React, { useState } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../hooks/useAppContext';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/designsystemet-react';
import { StudioButton, StudioCenter } from '@studio/components-legacy';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { ArrowRightIcon } from '@studio/icons';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';

export const Preview = () => {
  const { t } = useTranslation();
  const [isPreviewHidden, setIsPreviewHidden] = useState<boolean>(false);
  const layoutName = useSelector(selectedLayoutNameSelector);
  const noPageSelected = layoutName === 'default' || layoutName === undefined;

  const togglePreview = (): void => {
    setIsPreviewHidden((prev: boolean) => !prev);
  };

  return isPreviewHidden ? (
    <StudioButton variant='secondary' className={classes.openPreviewButton} onClick={togglePreview}>
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
  const { org, app } = useStudioEnvironmentParams();
  const [viewportToSimulate, setViewportToSimulate] = useState<SupportedView>('desktop');
  const { t } = useTranslation();
  const { previewIframeRef, selectedLayoutSet } = useAppContext();
  const layoutName = useSelector(selectedLayoutNameSelector);

  useUpdate(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
  }, [layoutName, previewIframeRef]);

  return (
    <div className={classes.root}>
      <ViewToggler onChange={setViewportToSimulate} />
      <div className={classes.previewArea}>
        <div className={classes.iframeContainer}>
          <iframe
            ref={previewIframeRef}
            className={cn(classes.iframe, classes[viewportToSimulate])}
            title={t('ux_editor.preview')}
            src={previewPage(org, app, selectedLayoutSet, undefined, undefined)}
          />
        </div>
        <PreviewLimitationsInfo />
      </div>
    </div>
  );
};

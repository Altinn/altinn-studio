import React, { useEffect, useState } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/designsystemet-react';
import { StudioButton, StudioCenter } from '@studio/components';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { ShrinkIcon } from '@studio/icons';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';

export type PreviewProps = {
  collapsed: boolean;
  onCollapseToggle: () => void;
  hidePreview?: boolean;
};

export const Preview = ({ collapsed, onCollapseToggle, hidePreview }: PreviewProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useAppContext();
  const noPageSelected =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  return collapsed ? (
    <StudioButton
      variant='secondary'
      className={classes.openPreviewButton}
      title={t('ux_editor.open_preview')}
      onClick={onCollapseToggle}
      fullWidth
    >
      {t('ux_editor.open_preview')}
    </StudioButton>
  ) : (
    <div className={classes.root}>
      <StudioButton
        variant='tertiary'
        icon={<ShrinkIcon title='1' fontSize='1.5rem' />}
        title={t('ux_editor.close_preview')}
        className={classes.closePreviewButton}
        onClick={onCollapseToggle}
      />
      {noPageSelected ? (
        <NoSelectedPageMessage />
      ) : (
        <>
          {hidePreview && (
            <div
              style={{
                display: 'block',
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
              }}
            ></div>
          )}
          <PreviewFrame />
        </>
      )}
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

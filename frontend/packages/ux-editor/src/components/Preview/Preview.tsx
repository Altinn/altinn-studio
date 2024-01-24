import React, { useState } from 'react';
import classes from './Preview.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../hooks/useAppContext';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/design-system-react';
import { StudioCenter } from '@studio/components';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';

export const Preview = () => {
  const layoutName = useSelector(selectedLayoutNameSelector);
  const noPageSelected = layoutName === 'default' || layoutName === undefined;

  return (
    <div className={classes.root}>
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
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();
  const { previewIframeRef } = useAppContext();
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
            src={previewPage(org, app, selectedLayoutSet)}
          />
        </div>
        <PreviewLimitationsInfo />
      </div>
    </div>
  );
};

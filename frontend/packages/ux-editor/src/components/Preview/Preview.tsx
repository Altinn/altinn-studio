import React, { useState } from 'react';
import classes from './Preview.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../hooks/useAppContext';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { previewPage } from 'app-shared/api/paths';
import { SupportedView, ViewToggler } from './ViewToggler/ViewToggler';

export const Preview = () => {
  const { org, app } = useStudioUrlParams();
  const [viewportToSimulate, setViewportToSimulate] = useState<SupportedView>('desktop');
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { t } = useTranslation();
  const { previewIframeRef } = useAppContext();
  const layoutName = useSelector(selectedLayoutNameSelector);

  useUpdate(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
  }, [layoutName, previewIframeRef]);

  return (
    <div className={classes.root}>
      <ViewToggler onChange={setViewportToSimulate} />
      <iframe
        ref={previewIframeRef}
        className={cn(classes.iframe, classes[viewportToSimulate])}
        title={t('ux_editor.preview')}
        src={previewPage(org, app, selectedLayoutSet)}
      />
    </div>
  );
};

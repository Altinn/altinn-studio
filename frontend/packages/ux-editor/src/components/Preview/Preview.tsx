import React from 'react';
import classes from './Preview.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../hooks/useAppContext';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { previewPage } from 'app-shared/api/paths';

export const Preview = () => {
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { t } = useTranslation();
  const { previewIframeRef } = useAppContext();
  const layoutName = useSelector(selectedLayoutNameSelector);

  useUpdate(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
  }, [layoutName, previewIframeRef]);

  return (
    <div className={classes.root}>
      <iframe
        ref={previewIframeRef}
        className={classes.iframe}
        title={t('ux_editor.preview')}
        src={previewPage(org, app, selectedLayoutSet)}
      />
    </div>
  );
};

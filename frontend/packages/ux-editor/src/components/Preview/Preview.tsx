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
import { Paragraph } from '@digdir/design-system-react';
import { Center } from 'app-shared/components/Center';

export const Preview = () => {
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { t } = useTranslation();
  const { previewIframeRef } = useAppContext();
  const layoutName = useSelector(selectedLayoutNameSelector);

  const hideComponents = layoutName === 'default' || layoutName === undefined;

  useUpdate(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
  }, [layoutName, previewIframeRef]);

  const displayContent = () => {
    if (hideComponents) {
      return (
        <Center>
          <Paragraph size='medium'>{t('ux_editor.no_components_selected')}</Paragraph>
        </Center>
      );
    }
    return (
      <iframe
        ref={previewIframeRef}
        className={classes.iframe}
        title={t('ux_editor.preview')}
        src={previewPage(org, app, selectedLayoutSet)}
      />
    );
  };

  return <div className={classes.root}>{displayContent()}</div>;
};

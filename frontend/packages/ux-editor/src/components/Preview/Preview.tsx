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
import { Alert, Button, Paragraph, LegacyPopover } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { Center } from 'app-shared/components/Center';
import { SupportedView, ViewToggler } from './ViewToggler/ViewToggler';
import { typedSessionStorage } from "app-shared/utils/webStorage";

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
    <Center>
      <Paragraph size='medium'>{t('ux_editor.no_components_selected')}</Paragraph>
    </Center>
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
  const [openSaveChoiceInSession, setOpenShowSaveChoiceInSession] = useState<boolean>(false);
  const showPreviewLimitationsInfoSession: boolean = typedSessionStorage.getItem('showPreviewLimitationsInfo');
  const [showPreviewLimitationsInfo, setShowPreviewLimitationsInfo] = useState<boolean>(showPreviewLimitationsInfoSession ?? true);

  const handleHidePreviewLimitations = () => {
    setShowPreviewLimitationsInfo(false);
    setOpenShowSaveChoiceInSession(false);
  };

  const handleRememberChoiceForSession = () => {
    typedSessionStorage.setItem('showPreviewLimitationsInfo', false);
    handleHidePreviewLimitations();
  };

  useUpdate(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
  }, [layoutName, previewIframeRef]);

  return (
    <div className={classes.root}>
      <ViewToggler onChange={setViewportToSimulate} />
      <div className={classes.gridContainer}>
      <iframe
        ref={previewIframeRef}
        className={cn(classes.iframe, classes[viewportToSimulate])}
        title={t('ux_editor.preview')}
        src={previewPage(org, app, selectedLayoutSet)}
      />
      {showPreviewLimitationsInfo &&
          <Alert severity='info' className={classes.previewLimitationsInfo}>
            <div className={classes.alert}>
              {t('preview.limitations_info')}
              <LegacyPopover
                  trigger={<Button onClick={() => setOpenShowSaveChoiceInSession(!openSaveChoiceInSession)} size='small' variant='tertiary' icon={<XMarkIcon />}/>}
                  open={openSaveChoiceInSession}
              >
                {t('session.reminder')}
                <span className={classes.row}>
                  <Button onClick={handleHidePreviewLimitations} size='small' variant='secondary'>{t('session.do_show_again')}</Button>
                  <Button onClick={handleRememberChoiceForSession} size='small' variant='secondary'>{t('session.dont_show_again')}</Button>
                </span>
              </LegacyPopover>
            </div>
          </Alert>}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewPage } from 'app-shared/api/paths';
import { Paragraph } from '@digdir/designsystemet-react';
import {
  StudioButton,
  StudioCenter,
  StudioAlert,
  StudioSpinner,
  StudioValidationMessage,
} from '@studio/components';
import type { SupportedView } from './ViewToggler/ViewToggler';
import { ViewToggler } from './ViewToggler/ViewToggler';
import { ShrinkIcon } from '@studio/icons';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery } from 'app-shared/hooks/queries';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

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
  const { previewIframeRef, selectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const taskId = useSelectedTaskId(layoutSet);
  const { t } = useTranslation();
  const { data: user } = useUserQuery();

  const { shouldReloadPreview, previewHasLoaded } = useAppContext();
  const checksum = useChecksum(shouldReloadPreview);
  const {
    mutate: createInstance,
    data: instance,
    isError: createInstanceError,
    isPending: createInstancePending,
  } = useCreatePreviewInstanceMutation(org, app);

  const currentLayoutSet = useGetLayoutSetByName({ name: layoutSet, org, app });
  const isSubform = currentLayoutSet?.type === 'subform';

  useEffect(() => {
    if (user && taskId) createInstance({ partyId: user?.id, taskId: taskId });
  }, [createInstance, user, taskId]);

  useEffect(() => {
    return () => {
      previewIframeRef.current = null;
    };
  }, [previewIframeRef]);

  if (createInstancePending || !instance) {
    return (
      <StudioCenter>
        {createInstanceError ? (
          <StudioValidationMessage>{t('general.page_error_title')}</StudioValidationMessage>
        ) : (
          <StudioSpinner aria-hidden spinnerTitle={t('preview.loading_preview_controller')} />
        )}
      </StudioCenter>
    );
  }
  const previewURL = previewPage(org, app, layoutSet, taskId, selectedFormLayoutName, instance?.id);

  return (
    <div className={classes.root}>
      <ViewToggler onChange={setViewportToSimulate} />
      {isSubform ? (
        <StudioAlert className={classes.alert} data-color='warning'>
          {t('ux_editor.preview.subform_unsupported_warning')}
        </StudioAlert>
      ) : (
        <div className={classes.previewArea}>
          <div className={classes.iframeContainer}>
            <iframe
              key={checksum}
              ref={previewIframeRef}
              className={cn(classes.iframe, classes[viewportToSimulate])}
              title={t('ux_editor.preview')}
              src={previewURL}
              onLoad={previewHasLoaded}
            />
          </div>
          <PreviewLimitationsInfo />
        </div>
      )}
    </div>
  );
};

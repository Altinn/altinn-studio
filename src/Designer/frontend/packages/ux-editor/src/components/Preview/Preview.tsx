import { useEffect } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewPage, previewPageV9 } from 'app-shared/api/paths';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioSpinner,
  StudioValidationMessage,
} from '@studio/components';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery, useAppVersionQuery } from 'app-shared/hooks/queries';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';
import { PreviewActions } from './PreviewActions/PreviewActions';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export type PreviewProps = {
  collapsed: boolean;
  onCollapseToggle: () => void;
};

export const Preview = ({ collapsed, onCollapseToggle }: PreviewProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useAppContext();
  const noPageSelected =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  return collapsed ? (
    <PreviewActions
      toggleTitle={t('ux_editor.open_preview')}
      className={classes.toolbarCollapsed}
      onCollapseToggle={onCollapseToggle}
    />
  ) : (
    <div className={classes.root}>
      <PreviewActions
        toggleTitle={t('ux_editor.close_preview')}
        className={classes.toolbar}
        onCollapseToggle={onCollapseToggle}
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
      <StudioParagraph data-size='md'>{t('ux_editor.no_components_selected')}</StudioParagraph>
    </StudioCenter>
  );
};

const PreviewFrame = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { t } = useTranslation();
  const { data: appVersion, isPending: isAppVersionPending } = useAppVersionQuery(org, app);
  const { data: user, isPending: isUserPending } = useUserQuery();
  const { isPending: isLayoutSetsPending } = useLayoutSetsQuery(org, app);
  const derivedTaskId = useSelectedTaskId(layoutSet);

  if (isAppVersionPending || isUserPending || isLayoutSetsPending) {
    return (
      <StudioCenter>
        <StudioSpinner aria-hidden spinnerTitle={t('preview.loading_preview_controller')} />
      </StudioCenter>
    );
  }

  const isV9App = !isBelowSupportedVersion(appVersion?.backendVersion ?? '', 9);
  const taskId = isV9App ? layoutSet : derivedTaskId;

  return <PreviewIframe partyId={user.id} taskId={taskId} isV9App={isV9App} />;
};

type PreviewIframeProps = {
  partyId: number;
  taskId: string;
  isV9App: boolean;
};

// The actual preview frame that displays the selected page
const PreviewIframe = ({ partyId, taskId, isV9App }: PreviewIframeProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { previewIframeRef, selectedFormLayoutName, shouldReloadPreview, previewHasLoaded } =
    useAppContext();
  const { layoutSet } = useUxEditorParams();
  const { t } = useTranslation();
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
    createInstance({ partyId, taskId });
  }, [createInstance, partyId, taskId]);

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
  const buildPreviewUrl = isV9App ? previewPageV9 : previewPage;
  const previewURL = buildPreviewUrl(
    org,
    app,
    layoutSet,
    taskId,
    selectedFormLayoutName,
    instance?.id,
  );

  return (
    <div className={classes.root}>
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
              className={classes.iframe}
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

import { useEffect } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewSessionHashPage } from 'app-shared/api/paths';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioSpinner,
  StudioValidationMessage,
} from '@designer/components';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { usePreviewSessionQuery } from 'app-shared/hooks/queries/usePreviewSessionQuery';
import { usePreviewSessionInstanceQuery } from 'app-shared/hooks/queries/usePreviewSessionInstanceQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioBridge } from 'app-shared/hooks/useStudioBridge';
import { PreviewActions } from './PreviewActions/PreviewActions';
import useUxEditorParams from '@altinn/ux-editor-v4/hooks/useUxEditorParams';

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
      <PreviewContent noPageSelected={noPageSelected} />
    </div>
  );
};

type PreviewContentProps = {
  noPageSelected: boolean;
};

const PreviewContent = ({ noPageSelected }: PreviewContentProps) => {
  if (noPageSelected) return <NoSelectedPageMessage />;
  return <PreviewFrame />;
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

// The actual preview frame that displays the selected page
// The bridge only takes messages from the frame's origin, so a URL that doesn't parse leaves it without one.
const originOf = (url: string | undefined): string | undefined => {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
};

const ignoreComponentErrors = (): void => {};

const PreviewFrame = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { previewIframeRef, selectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const taskId = useSelectedTaskId(layoutSet);
  const { t } = useTranslation();

  const { shouldReloadPreview, previewHasLoaded, previewBridgeOriginRef } = useAppContext();
  const checksum = useChecksum(shouldReloadPreview);
  const { isPending: isLayoutSetsPending } = useLayoutSetsQuery(org, app);
  const { data: session, isError: isSessionError } = usePreviewSessionQuery(org, app);
  const sessionUrlOnceTheTaskIsKnown = isLayoutSetsPending ? undefined : session?.url;
  const { data: instance, isError: isInstanceError } = usePreviewSessionInstanceQuery(
    org,
    app,
    sessionUrlOnceTheTaskIsKnown,
    taskId,
  );

  const currentLayoutSet = useGetLayoutSetByName({ name: layoutSet, org, app });
  const isSubform = currentLayoutSet?.type === 'subform';

  useEffect(() => {
    return () => {
      previewIframeRef.current = null;
    };
  }, [previewIframeRef]);

  const previewURL =
    session && instance
      ? previewSessionHashPage(session.url, instance.instanceId, taskId, selectedFormLayoutName)
      : undefined;
  // The v8 editor shows no errors, so the bridge in a v8 app's page reports none.
  useStudioBridge(
    previewIframeRef,
    originOf(session?.url),
    ignoreComponentErrors,
    previewBridgeOriginRef,
  );
  // Each page in the frame says when it is ready for changes, so what the page before said goes.
  useEffect(() => {
    previewBridgeOriginRef.current = null;
    return () => {
      previewBridgeOriginRef.current = null;
    };
  }, [previewURL, checksum, previewBridgeOriginRef]);

  if (isSessionError || isInstanceError) {
    return (
      <StudioCenter>
        <StudioValidationMessage>{t('general.page_error_title')}</StudioValidationMessage>
      </StudioCenter>
    );
  }

  if (!session || !instance) {
    return (
      <StudioCenter>
        <StudioSpinner aria-hidden spinnerTitle={t('preview.loading_preview_controller')} />
      </StudioCenter>
    );
  }

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

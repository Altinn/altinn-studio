import { useEffect } from 'react';
import classes from './Preview.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { useChecksum } from '../../hooks/useChecksum.ts';
import { previewSessionPage } from 'app-shared/api/paths';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioSpinner,
  StudioValidationMessage,
} from '@studio/components';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { PreviewDisabledInfo } from 'app-shared/components/PreviewDisabledInfo/PreviewDisabledInfo';
import { isPreviewDisabled } from 'app-shared/utils/previewAvailability';
import { usePreviewSessionQuery } from 'app-shared/hooks/queries/usePreviewSessionQuery';
import { usePreviewSessionInstanceQuery } from 'app-shared/hooks/queries/usePreviewSessionInstanceQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStartPreviewOver } from 'app-shared/hooks/useStartPreviewOver';
import { PreviewActions } from './PreviewActions/PreviewActions';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export type PreviewProps = {
  collapsed: boolean;
  onCollapseToggle: () => void;
};

export const Preview = ({ collapsed, onCollapseToggle }: PreviewProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutName } = useAppContext();
  const startPreviewOver = useStartPreviewOver(org, app);
  const noPageSelected =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;
  const showsPreview = !isPreviewDisabled && !noPageSelected;

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
        onStartOver={showsPreview ? startPreviewOver : undefined}
      />
      <PreviewContent noPageSelected={noPageSelected} />
    </div>
  );
};

type PreviewContentProps = {
  noPageSelected: boolean;
};

const PreviewContent = ({ noPageSelected }: PreviewContentProps) => {
  if (isPreviewDisabled) return <PreviewDisabledInfo className={classes.alert} />;
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

// The preview service shows the developer's working copy on a domain of its own. The page uses one session, and an
// instance at the task of each layout set it shows. In a v9 app, a layout set has the name of its task.
const PreviewFrame = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { previewIframeRef, selectedFormLayoutName, shouldReloadPreview, previewHasLoaded } =
    useAppContext();
  const { t } = useTranslation();
  const checksum = useChecksum(shouldReloadPreview);
  const { isPending: isLayoutSetsPending } = useLayoutSetsQuery(org, app);
  const currentLayoutSet = useGetLayoutSetByName({ name: layoutSet, org, app });
  const { data: session, isError: isSessionError } = usePreviewSessionQuery(org, app);
  const { data: instance, isError: isInstanceError } = usePreviewSessionInstanceQuery(
    org,
    app,
    session?.url,
    layoutSet,
  );

  useEffect(() => {
    return () => {
      previewIframeRef.current = null;
    };
  }, [previewIframeRef]);

  if (isSessionError || isInstanceError) {
    return (
      <StudioCenter>
        <StudioValidationMessage>{t('general.page_error_title')}</StudioValidationMessage>
      </StudioCenter>
    );
  }

  if (isLayoutSetsPending || !session || !instance) {
    return (
      <StudioCenter>
        <StudioSpinner aria-hidden spinnerTitle={t('preview.loading_preview_controller')} />
      </StudioCenter>
    );
  }

  const isSubform = currentLayoutSet?.type === 'subform';
  const previewURL = previewSessionPage(
    session.url,
    instance.instanceId,
    layoutSet,
    selectedFormLayoutName,
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

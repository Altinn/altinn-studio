import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React from 'react';
import { usePreviewContext } from '../../contexts/PreviewContext';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { StudioPageSpinner } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { MAXIMUM_SUPPORTED_FRONTEND_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

export const UiEditor = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: version, isPending: fetchingVersionIsPending } = useAppVersionQuery(org, app);
  const { shouldReloadPreview, previewHasLoaded } = usePreviewContext();
  const { setSelectedLayoutSetName } = useLayoutContext();

  if (fetchingVersionIsPending) {
    return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
  }

  if (!version) return null;

  const renderUiEditorContent = () => {
    const handleLayoutSetNameChange = (layoutSetName: string) => {
      setSelectedLayoutSetName(layoutSetName);
    };

    return (
      <UiEditorLatest
        shouldReloadPreview={shouldReloadPreview}
        previewHasLoaded={previewHasLoaded}
        onLayoutSetNameChange={handleLayoutSetNameChange}
      />
    );
  };

  const isLatestFrontendVersion = !isBelowSupportedVersion(
    version?.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );

  return isLatestFrontendVersion ? renderUiEditorContent() : <UiEditorV3 />;
};

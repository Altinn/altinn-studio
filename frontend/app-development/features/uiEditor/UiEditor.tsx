import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React from 'react';
import { usePreviewContext } from '../../contexts/PreviewContext';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { StudioPageSpinner } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';

const latestFrontendVersion = '4';
const isLatestFrontendVersion = (version: AppVersion): boolean =>
  version?.frontendVersion?.startsWith(latestFrontendVersion);

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

  return isLatestFrontendVersion(version) ? renderUiEditorContent() : <UiEditorV3 />;
};

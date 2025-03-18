import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React, { Suspense } from 'react';
import { usePreviewContext } from '../../contexts/PreviewContext';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

const UiEditorV4 = React.lazy(() => import('@altinn/ux-editor/SubApp'));
const UiEditorV3 = React.lazy(() => import('@altinn/ux-editor-v3/SubApp'));

const latestFrontendVersion = '4';
const isLatestFrontendVersion = (version: AppVersion): boolean =>
  version?.frontendVersion?.startsWith(latestFrontendVersion);

export default function UiEditor() {
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
      <UiEditorV4
        shouldReloadPreview={shouldReloadPreview}
        previewHasLoaded={previewHasLoaded}
        onLayoutSetNameChange={handleLayoutSetNameChange}
      />
    );
  };

  return (
    <Suspense fallback={<StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />}>
      {isLatestFrontendVersion(version) ? renderUiEditorContent() : <UiEditorV3 />}
    </Suspense>
  );
}

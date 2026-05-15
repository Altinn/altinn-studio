import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
import { SubApp as UiEditorV4 } from '@altinn/ux-editor-v4/SubApp';
import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { usePreviewContext } from '../../contexts/PreviewContext';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { MAXIMUM_SUPPORTED_FRONTEND_VERSION, NEXT_V9_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

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

  const handleLayoutSetNameChange = (layoutSetName: string) => {
    setSelectedLayoutSetName(layoutSetName);
  };

  const sharedProps = {
    shouldReloadPreview,
    previewHasLoaded,
    onLayoutSetNameChange: handleLayoutSetNameChange,
  };

  const isV9 = !isBelowSupportedVersion(version.frontendVersion, NEXT_V9_VERSION);

  if (isV9) {
    return <UiEditorLatest {...sharedProps} />;
  }

  const isLatestSupportedVersion = !isBelowSupportedVersion(
    version.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );

  if (isLatestSupportedVersion) {
    return <UiEditorV4 {...sharedProps} />;
  }

  return <UiEditorV3 />;
}

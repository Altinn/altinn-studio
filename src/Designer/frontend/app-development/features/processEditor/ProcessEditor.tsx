import React from 'react';
import { ProcessEditor as ProcessEditorV8 } from '@altinn/process-editor-v8';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { NEXT_V9_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

export default function ProcessEditor(): React.ReactElement | null {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: version, isPending: versionIsPending } = useAppVersionQuery(org, app);

  if (versionIsPending) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} />;
  }

  // An app whose version cannot be determined is served the v8 editor, which renders the
  // read-only viewer for anything older than v8. The process editor follows the app library
  // version, not the app frontend version, so the check is on backendVersion.
  const isV9 = !isBelowSupportedVersion(version?.backendVersion, NEXT_V9_VERSION);

  return isV9 ? null : <ProcessEditorV8 />;
}

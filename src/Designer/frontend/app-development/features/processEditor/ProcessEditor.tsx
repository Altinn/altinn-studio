import React from 'react';
import { ProcessEditor as ProcessEditorLatest } from '@altinn/process-editor';
import { ProcessEditor as ProcessEditorV8 } from '@altinn/process-editor-v8';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { NEXT_V9_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

export default function ProcessEditor(): React.ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: version, isPending: versionIsPending } = useAppVersionQuery(org, app);

  if (versionIsPending) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} />;
  }

  // Select the editor by app backend version. If the version is unknown, use the v8 editor, which also
  // provides the viewer for older apps.
  const isV9 = !isBelowSupportedVersion(version?.backendVersion, NEXT_V9_VERSION);

  return isV9 ? <ProcessEditorLatest /> : <ProcessEditorV8 />;
}

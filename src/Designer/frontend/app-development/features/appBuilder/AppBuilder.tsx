import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { AppBuilder as AppBuilderEditor } from '@altinn/app-builder';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { RoutePaths } from 'app-development/enums/RoutePaths';

export default function AppBuilder(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const isAppBuilderEnabled = useFeatureFlag(FeatureFlag.AppBuilder);

  if (!isAppBuilderEnabled) return <Navigate to={`../${RoutePaths.UIEditor}`} replace />;

  return <AppBuilderEditor org={org} app={app} />;
}

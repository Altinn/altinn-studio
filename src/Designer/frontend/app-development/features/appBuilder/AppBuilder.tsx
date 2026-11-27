import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBuilder as AppBuilderEditor } from '@altinn/app-builder';
import { StudioPageSpinner } from '@designer/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useAppBuilderAvailability } from './useAppBuilderAvailability';
import { AppBuilderFeedback } from './AppBuilderFeedback';

export default function AppBuilder(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { isPending, isAvailable } = useAppBuilderAvailability(org, app);

  if (isPending) return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
  if (!isAvailable) return <Navigate to={`../${RoutePaths.UIEditor}`} replace />;

  return (
    <>
      <AppBuilderEditor org={org} app={app} />
      <AppBuilderFeedback />
    </>
  );
}

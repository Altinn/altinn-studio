import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { typedLocalStorage } from '@studio/components';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';

export const useBackToEditingHref = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);

  const packagesRouter = new PackagesRouter({ org, app });
  const queryParams: string = `?layout=${typedLocalStorage.getItem(instanceId)}`;

  return `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}${queryParams}`;
};

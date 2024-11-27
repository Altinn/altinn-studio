import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export const useBackToEditingHref = () => {
  const { org, app } = useStudioEnvironmentParams();

  const packagesRouter = new PackagesRouter({ org, app });

  return `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}`;
};

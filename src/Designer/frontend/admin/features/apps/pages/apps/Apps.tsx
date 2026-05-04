import { AppsTable } from './components/AppsTable';
import { useTranslation } from 'react-i18next';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';

export const Apps = () => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams('owner');

  return (
    <div>
      <h1>{t('admin.apps.title')}</h1>
      <AppsTable org={org} />
    </div>
  );
};

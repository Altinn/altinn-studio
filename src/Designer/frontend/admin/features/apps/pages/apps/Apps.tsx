import { AppsTable } from './components/AppsTable';
import { useTranslation } from 'react-i18next';
import { useRoutePathsParams } from 'admin/hooks/useRoutePathsParams';

export const Apps = () => {
  const { t } = useTranslation();
  const { owner: org } = useRoutePathsParams();

  return (
    <div>
      <h1>{t('admin.apps.title')}</h1>
      <AppsTable org={org} />
    </div>
  );
};

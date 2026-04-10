import { Outlet, useNavigate } from 'react-router-dom';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useContextRedirectionGuard } from '../../hooks/guards/useContextRedirectionGuard';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useSubroute } from '../../hooks/useSubRoute';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { StudioPageLayout } from 'app-shared/components';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);
  const selectedContext = useSelectedContext();
  const subroute = useSubroute();
  const navigate = useNavigate();

  if (!isRedirectionComplete) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;

  const isOrg =
    selectedContext !== SelectedContextType.All &&
    selectedContext !== SelectedContextType.Self &&
    selectedContext !== SelectedContextType.None;

  const currentAccountId = isOrg ? selectedContext : user?.login;

  const onSelectAccount = (accountId: string, isCompany: boolean) => {
    const context = isCompany ? accountId : SelectedContextType.Self;
    navigate(`${subroute}/${context}`);
  };

  return (
    <StudioPageLayout
      currentAccountId={currentAccountId}
      onSelectAccount={onSelectAccount}
      hideBreadcrumbs={true}
    >
      <Outlet />
    </StudioPageLayout>
  );
};

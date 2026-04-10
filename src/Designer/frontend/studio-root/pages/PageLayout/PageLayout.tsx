import { Outlet, useNavigate } from 'react-router-dom';
import { StudioPageLayout } from 'app-shared/components';
import { useTranslation } from 'react-i18next';

export const PageLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <StudioPageLayout
      breadcrumbs={{
        items: [
          {
            onClick: () => navigate('/'),
            label: t('footer.help_and_contact'),
          },
        ],
      }}
      onSelectAccount={() => navigate('/')}
      currentAccountId={''}
    >
      <Outlet />
    </StudioPageLayout>
  );
};

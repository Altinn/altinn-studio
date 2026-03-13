import React, { type ReactElement, type ReactNode } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { SubHeader } from './SubHeader';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { useTranslation } from 'react-i18next';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/hooks/useUserNameAndOrg';
import { CreatedFor } from 'app-development/features/appSettings/components/TabsContent/Tabs/AboutTab/CreatedFor';
import { PageLayout } from 'app-shared/layout';

export type PageHeaderProps = {
  showSubMenu: boolean;
  isRepoError?: boolean;
  children?: ReactNode;
};

export const PageHeader = ({
  showSubMenu,
  isRepoError,
  children,
}: PageHeaderProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: applicationMetadata } = useAppMetadataQuery(org, app);
  const { user, menuItems, profileMenuGroups } = usePageHeaderContext();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  const profileMenuFooter =
    repository != null ? (
      <CreatedFor repository={repository} authorName={applicationMetadata?.createdBy ?? ''} />
    ) : undefined;

  const centerContent = menuItems && (
    <LargeNavigationMenu
      menuItems={menuItems.map((menuItem: HeaderMenuItem) => ({
        link: menuItem.link,
        name: t(menuItem.key),
        isBeta: menuItem.isBeta,
      }))}
    />
  );

  const subContent =
    showSubMenu && !isRepoError ? <SubHeader hasRepoError={isRepoError} /> : undefined;

  return (
    <PageLayout
      user={user}
      title={app}
      centerContent={centerContent}
      subContent={subContent}
      profileMenuGroups={profileMenuGroups}
      triggerButtonText={userNameAndOrg}
      profileMenuFooter={profileMenuFooter}
    >
      {children}
    </PageLayout>
  );
};

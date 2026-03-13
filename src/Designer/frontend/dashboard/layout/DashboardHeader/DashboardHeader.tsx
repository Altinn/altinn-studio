import React, { type ReactElement, type ReactNode } from 'react';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useHeaderContext } from '../../context/HeaderContext';
import { useProfileMenuTriggerButtonText } from '../../hooks/useProfileMenuTriggerButtonText';
import { usePageHeaderTitle } from '../../hooks/usePageHeaderTitle';
import { SubHeader } from './SubHeader';
import { Subroute } from '../../enums/Subroute';
import { isOrg } from '../../utils/orgUtils';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { mapNavigationMenuToProfileMenu } from '../../utils/headerUtils';
import { useSubroute } from '../../hooks/useSubRoute';
import { PageLayout } from 'app-shared/layout';

type DashboardHeaderProps = {
  children?: ReactNode;
};

export const DashboardHeader = ({ children }: DashboardHeaderProps): ReactElement => {
  const pageHeaderTitle: string = usePageHeaderTitle();
  const selectedContext = useSelectedContext();
  const subroute = useSubroute();
  const { user, menuItems, profileMenuGroups } = useHeaderContext();
  const triggerButtonText = useProfileMenuTriggerButtonText();

  const isOrgLibraryPage: boolean = subroute === Subroute.OrgLibrary;
  const shouldShowSubMenu: boolean = isOrg(selectedContext) && isOrgLibraryPage;

  return (
    <PageLayout
      user={user}
      title={pageHeaderTitle}
      centerContent={<LargeNavigationMenu menuItems={menuItems} />}
      subContent={shouldShowSubMenu ? <SubHeader /> : undefined}
      profileMenuGroups={mapNavigationMenuToProfileMenu(profileMenuGroups)}
      triggerButtonText={triggerButtonText}
    >
      {children}
    </PageLayout>
  );
};

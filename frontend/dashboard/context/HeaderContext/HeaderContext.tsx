import React, { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type Organization } from 'app-shared/types/Organization';
import { type User } from 'app-shared/types/Repository';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { dashboardHeaderMenuItems } from '../../utils/headerUtils/headerUtils';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useRepoPath } from '../../hooks/useRepoPath';
import { useSubroute } from '../../hooks/useSubRoute';
import { type NavigationMenuItem } from '../../types/NavigationMenuItem';
import { type NavigationMenuGroup } from '../../types/NavigationMenuGroup';
import type { HeaderMenuItem } from '../../types/HeaderMenuItem';
import { SelectedContextType } from '../../enums/SelectedContextType';

export type HeaderContextProps = {
  selectableOrgs?: Organization[];
  user: User;
  menuItems: HeaderMenuItem[];
  profileMenuItems: NavigationMenuItem[];
  profileMenuGroups: NavigationMenuGroup[];
};

export const HeaderContext = createContext<Partial<HeaderContextProps>>(undefined);

export type HeaderContextProviderProps = {
  children: ReactNode;
} & HeaderContextProps;

export const HeaderContextProvider = ({
  children,
  user,
  selectableOrgs,
}: Partial<HeaderContextProviderProps>): ReactElement => {
  const { t } = useTranslation();

  const { mutate: logout } = useLogoutMutation();
  const selectedContext = useSelectedContext();
  const navigate = useNavigate();
  const repoPath = useRepoPath(user, selectableOrgs);
  const subroute = useSubroute();

  const handleSetSelectedContext = (context: string | SelectedContextType) => {
    navigate(`${subroute}/${context}${location.search}`);
  };

  const allMenuItem: NavigationMenuItem = {
    action: { type: 'button', onClick: () => handleSetSelectedContext(SelectedContextType.All) },
    itemName: t('shared.header_all'),
    isActive: selectedContext === SelectedContextType.All,
  };

  const selectableOrgMenuItems: NavigationMenuItem[] =
    selectableOrgs?.map((selectableOrg: Organization) => ({
      action: { type: 'button', onClick: () => handleSetSelectedContext(selectableOrg.username) },
      itemName: selectableOrg?.full_name || selectableOrg.username,
      isActive: selectedContext === selectableOrg.username,
    })) ?? [];

  const selfMenuItem: NavigationMenuItem = {
    action: { type: 'button', onClick: () => handleSetSelectedContext(SelectedContextType.Self) },
    itemName: user?.full_name || user?.login,
    isActive: selectedContext === SelectedContextType.Self,
  };

  const giteaMenuItem: NavigationMenuItem = {
    action: { type: 'link', href: repoPath, openInNewTab: true },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem: NavigationMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const selectableOrgMenuGroup: NavigationMenuGroup = {
    name: t('dashboard.header_menu_all_orgs'),
    showName: true,
    items: [allMenuItem, ...selectableOrgMenuItems, selfMenuItem],
  };
  const profileMenuItems: NavigationMenuItem[] = [giteaMenuItem, logOutMenuItem];

  const profileMenuGroups: NavigationMenuGroup[] = [
    selectableOrgMenuGroup,
    {
      name: t('dashboard.header_menu_other'),
      showName: false,
      items: [giteaMenuItem, logOutMenuItem],
    },
  ];

  return (
    <HeaderContext.Provider
      value={{
        user,
        selectableOrgs,
        menuItems: dashboardHeaderMenuItems.map((item) => ({ name: t(item.name), ...item })),
        profileMenuItems,
        profileMenuGroups,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderContext = (): Partial<HeaderContextProps> => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeaderContext must be used within a HeaderContextProvider');
  }
  return context;
};

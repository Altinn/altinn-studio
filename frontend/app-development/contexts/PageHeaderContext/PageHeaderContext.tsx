import React, { type ReactElement, type ReactNode, createContext, useContext } from 'react';
import { type User } from 'app-shared/types/Repository';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { type StudioProfileMenuItem } from '@studio/components';
import { getTopBarMenuItems } from 'app-development/utils/headerMenu/headerMenuUtils';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export type PageHeaderContextProps = {
  user: User;
  menuItems: HeaderMenuItem[];
  profileMenuItems: StudioProfileMenuItem[]; // TODO - a better way for this type?
  repoOwnerIsOrg: boolean;
};

export const PageHeaderContext = createContext<Partial<PageHeaderContextProps>>(undefined);

export type PageHeaderContextProviderProps = {
  children: ReactNode;
} & PageHeaderContextProps;

export const PageHeaderContextProvider = ({
  children,
  user,
  repoOwnerIsOrg,
}: Partial<PageHeaderContextProviderProps>): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: logout } = useLogoutMutation();

  const repoType = getRepositoryType(org, app);
  const menuItems = getTopBarMenuItems(repoType, repoOwnerIsOrg);

  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl('nb'), openInNewTab: true },
    itemName: t('sync_header.documentation'),
    hasDivider: true,
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuItems: StudioProfileMenuItem[] = [docsMenuItem, logOutMenuItem];

  return (
    <PageHeaderContext.Provider value={{ user, menuItems, profileMenuItems }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeaderContext = (): Partial<PageHeaderContextProps> => {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error('usePageHeaderContext must be used within a PageHeaderContextProvider');
  }
  return context;
};

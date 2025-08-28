import { type PageHeaderContextProps } from 'app-development/contexts/PageHeaderContext/PageHeaderContext';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { userMock } from './userMock';
import { type StudioProfileMenuGroup, type StudioProfileMenuItem } from '@studio/components-legacy';
import { type PreviewContextProps } from 'app-development/contexts/PreviewContext';
import { org, app } from '@studio/testing/testids';

const menuItemsMock: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.About,
    link: `/${org}/${app}/a`,
    repositoryTypes: [],
    group: HeaderMenuGroupKey.Overview,
  },
  {
    key: HeaderMenuItemKey.Create,
    link: `/${org}/${app}/b`,
    repositoryTypes: [],
    group: HeaderMenuGroupKey.Other,
  },
];

const profileMenuItem1Mock: StudioProfileMenuItem = {
  action: { type: 'button', onClick: () => {} },
  itemName: 'test',
};

export const profileMenuItemsMock: StudioProfileMenuItem[] = [profileMenuItem1Mock];
export const profileMenuGroupsMock: StudioProfileMenuGroup[] = [{ items: [profileMenuItem1Mock] }];

export const pageHeaderContextMock: PageHeaderContextProps = {
  user: userMock,
  menuItems: menuItemsMock,
  profileMenuItems: profileMenuItemsMock,
  profileMenuGroups: profileMenuGroupsMock,
  repoOwnerIsOrg: true,
  variant: 'regular',
  returnTo: null,
};

export const previewContextMock: PreviewContextProps = {
  doReloadPreview: () => {},
  shouldReloadPreview: false,
  previewHasLoaded: () => {},
};

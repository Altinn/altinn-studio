import { type PageHeaderContextProps } from 'app-development/contexts/PageHeaderContext/PageHeaderContext';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { userMock } from './userMock';
import { type StudioProfileMenuGroup, type StudioProfileMenuItem } from '@studio/components';
import { type PreviewContextProps } from 'app-development/contexts/PreviewContext';

const menuItemsMock: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.About,
    link: '/a',
    repositoryTypes: [],
    group: HeaderMenuGroupKey.Overview,
  },
  {
    key: HeaderMenuItemKey.Create,
    link: '/b',
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

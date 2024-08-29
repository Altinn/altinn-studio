import { type PageHeaderContextProps } from 'app-development/contexts/PageHeaderContext/PageHeaderContext';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { userMock } from './userMock';
import { type StudioProfileMenuItem } from '@studio/components';
import { type PreviewContextProps } from 'app-development/contexts/PreviewContext';

// TODO - Used more than one place?
export const menuItemsMock: HeaderMenuItem[] = [
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

export const profileMenuItemsMock: StudioProfileMenuItem[] = [
  {
    action: { type: 'button', onClick: () => {} },
    itemName: 'test',
  },
];

export const pageHeaderContextMock: PageHeaderContextProps = {
  user: userMock,
  menuItems: menuItemsMock,
  profileMenuItems: profileMenuItemsMock,
  repoOwnerIsOrg: true,
  variant: 'regular',
};

export const previewContextMock: PreviewContextProps = {
  doReloadPreview: () => {},
  shouldReloadPreview: false,
  previewHasLoaded: () => {},
};

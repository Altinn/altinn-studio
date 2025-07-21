import type { HeaderMenuGroupKey } from '../enums/HeaderMenuGroupKey';
import type { HeaderMenuItemKey } from '../enums/HeaderMenuItemKey';

export type HeaderMenuItem = {
  key: HeaderMenuItemKey;
  link: string;
  name: string;
  group: HeaderMenuGroupKey;
  isBeta?: boolean;
};

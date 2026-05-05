import type { HeaderMenuGroupKey } from '../enums/HeaderMenuGroupKey';
import type { HeaderMenuItemKey } from '../enums/HeaderMenuItemKey';
import type { FeatureFlag } from '@studio/feature-flags';

export type HeaderMenuItem = {
  key: HeaderMenuItemKey;
  getLink: (selectedContext?: string) => string;
  name: string;
  group: HeaderMenuGroupKey;
  isBeta?: boolean;
  featureFlag?: FeatureFlag;
  isExternalLink?: boolean;
};

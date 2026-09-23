import { type HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { type HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type RepositoryType } from 'app-shared/types/global';
import { type FeatureFlag } from '@studio/feature-flags';
import { type FeatureName } from 'app-shared/enums/CanUseFeature';

export interface HeaderMenuItem {
  key: HeaderMenuItemKey;
  link: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  requiresOrgOwnedRepo?: boolean;
  featureFlagName?: FeatureFlag;
  requiredFeature?: FeatureName;
  isBeta?: boolean;
  group: HeaderMenuGroupKey;
}

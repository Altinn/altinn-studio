import { type HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { type HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type RepositoryType } from 'app-shared/types/global';
import { type SupportedFeatureFlags } from 'app-shared/utils/featureToggleUtils';

export interface HeaderMenuItem {
  key: HeaderMenuItemKey;
  link: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  featureFlagName?: SupportedFeatureFlags;
  isBeta?: boolean;
  group: HeaderMenuGroupKey;
}

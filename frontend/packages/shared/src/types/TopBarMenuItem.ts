import type { TopBarGroup, TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { RepositoryType } from './global';
import type { SupportedFeatureFlags } from 'app-shared/utils/featureToggleUtils';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  featureFlagName?: SupportedFeatureFlags;
  isBeta?: boolean;
  group: TopBarGroup;
}

// TODO move
export interface TopBarMenuGroup {
  groupName: string;
  menuItems: TopBarMenuItem[];
}

// TODO move and RENAME
export interface TopBarMenuDeploymentItem {
  key: TopBarMenu;
  link: string;
  group: TopBarGroup;
}

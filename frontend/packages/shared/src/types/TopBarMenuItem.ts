import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from './global';
import { SupportedFeatureFlags } from 'app-shared/utils/featureToggleUtils';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  featureFlagName?: SupportedFeatureFlags;
  isBeta?: boolean;
}

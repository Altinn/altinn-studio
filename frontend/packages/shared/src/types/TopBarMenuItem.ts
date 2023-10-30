import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from './global';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
  repositoryTypes: RepositoryType[];
}

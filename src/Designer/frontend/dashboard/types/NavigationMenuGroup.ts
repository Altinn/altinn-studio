import { type NavigationMenuItem } from './NavigationMenuItem';

export type NavigationMenuGroup = {
  name: string;
  showName?: boolean;
  items: NavigationMenuItem[];
};

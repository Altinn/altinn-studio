import { type NavigationMenuSmallItem } from './NavigationMenuItem';

export type NavigationMenuSmallGroup = {
  name: string;
  showName?: boolean;
  items: NavigationMenuSmallItem[];
};

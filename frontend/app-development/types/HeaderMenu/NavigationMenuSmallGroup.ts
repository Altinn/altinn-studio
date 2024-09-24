import { type NavigationMenuSmallItem } from './NavigationMenuSmallItem';

export type NavigationMenuSmallGroup = {
  name: string;
  showName?: boolean;
  items: NavigationMenuSmallItem[];
};

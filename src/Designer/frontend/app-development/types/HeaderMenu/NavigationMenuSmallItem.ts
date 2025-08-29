type NavigationMenuItemButton = {
  type: 'button';
  onClick: () => void;
};

type NavigationMenuItemLink = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

export type NavigationMenuSmallItem = {
  name: string;
  action: NavigationMenuItemButton | NavigationMenuItemLink;
  isBeta?: boolean;
};

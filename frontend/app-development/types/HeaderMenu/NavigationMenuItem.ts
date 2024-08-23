// TODO MOVE
export type NavigationMenuItemButton = {
  type: 'button';
  onClick: () => void;
};

export type NavigationMenuItemLink = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

export type NavigationMenuItem = {
  name: string;
  link: string;
  isBeta?: boolean;
};

export type NavigationMenuSmallItem = {
  name: string;
  action: NavigationMenuItemButton | NavigationMenuItemLink;
  isBeta?: boolean;
};

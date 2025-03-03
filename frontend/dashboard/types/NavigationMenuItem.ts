type NavigationMenuItemButton = {
  type: 'button';
  onClick: () => void;
};

type NavigationMenuItemLink = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

export type NavigationMenuItem = {
  name: string;
  action: NavigationMenuItemButton | NavigationMenuItemLink;
  isActive?: boolean;
};

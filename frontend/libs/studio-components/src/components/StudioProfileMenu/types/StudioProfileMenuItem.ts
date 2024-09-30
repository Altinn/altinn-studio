type StudioProfileMenuItemButton = {
  type: 'button';
  onClick: () => void;
};

type StudioProfileMenuItemLink = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

export type StudioProfileMenuItem = {
  action: StudioProfileMenuItemButton | StudioProfileMenuItemLink;
  itemName: string;
  isActive?: boolean;
};

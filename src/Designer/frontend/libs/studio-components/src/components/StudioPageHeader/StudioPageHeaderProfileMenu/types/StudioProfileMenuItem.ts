export type StudioProfileMenuItem<T extends StudioProfileMenuItemType = StudioProfileMenuItemType> =
  {
    action: StudioProfileMenuItemAction<T>;
    itemName: string;
    isActive?: boolean;
  };

type StudioProfileMenuItemType = 'button' | 'link';
type StudioProfileMenuItemAction<T extends StudioProfileMenuItemType> = {
  button: StudioProfileMenuItemButtonAction;
  link: StudioProfileMenuItemLinkAction;
}[T];

type StudioProfileMenuItemButtonAction = {
  type: 'button';
  onClick: () => void;
};

type StudioProfileMenuItemLinkAction = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

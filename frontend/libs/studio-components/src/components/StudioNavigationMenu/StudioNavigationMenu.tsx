import React, { type HTMLAttributes, useState, type ComponentType, type ReactElement } from 'react';
import classes from './StudioNavigationMenu.module.css';
import {
  StudioNavigationButton,
  type StudioNavigationButtonProps,
} from '../StudioNavigationButton/StudioNavigationButton';
import { useIsSmallWidth } from '../../hooks';
import { StudioButton, type StudioButtonProps } from '../StudioButton';
import { Divider, DropdownMenu, Link } from '@digdir/designsystemet-react';

type StudioNavigationMenuItem = {
  name: string;
  link: string;
  isBeta?: boolean;
  StudioNavigationLinkComponent: ComponentType<StudioNavigationButtonProps>;
};

export type StudioNavigationMenuProps = {
  menuItems: StudioNavigationMenuItem[];
  windowResizeWidth: number;
  anchorButtonProps: StudioButtonProps;
};

// TODO - Make the two navigation components separate components
export const StudioNavigationMenu = ({
  menuItems,
  windowResizeWidth,
  anchorButtonProps,
}: StudioNavigationMenuProps): ReactElement => {
  return (
    <ul className={classes.menu}>
      {menuItems.map((menuItem: StudioNavigationMenuItem) => (
        <li key={menuItem.name} className={classes.menuItem}>
          <StudioNavigationButton
            LinkComponent={menuItem.StudioNavigationLinkComponent}
            isBeta={menuItem.isBeta}
            text={menuItem.name}
            link={menuItem.link}
          />
        </li>
      ))}
    </ul>
  );
};

type StudioNavigationLinkComponentProps = HTMLAttributes<HTMLAnchorElement> & {
  link: string;
  text: string;
};

type StudioNavigationMenuSmallItem = {
  name: string;
  link: string;
  isBeta?: boolean;
  LinkComponent: ComponentType<StudioNavigationLinkComponentProps>;
};

type StudioNavigationMenuSmallGroup = {
  name: string;
  showName?: boolean;
  items: StudioNavigationMenuSmallItem[];
};

export type StudioNavigationMenuSmallProps = {
  menuGroups: StudioNavigationMenuSmallGroup[];
  windowResizeWidth: number;
  anchorButtonProps: StudioButtonProps;
};

export const StudioNavigationMenuSmall = ({
  menuGroups,
  windowResizeWidth,
  anchorButtonProps,
}: StudioNavigationMenuSmallProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    console.log('CLOSE');
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={handleToggleMenu}
          {...anchorButtonProps}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {/* MOVE THIS TO SHARED */}
        {menuGroups.map((menuGroup: StudioNavigationMenuSmallGroup, index: number) => (
          <React.Fragment key={menuGroup.name}>
            <DropdownMenu.Group heading={menuGroup.showName ? menuGroup.name : ''}>
              {menuGroup.items.map((menuItem: StudioNavigationMenuSmallItem) => {
                const { LinkComponent, name, link } = menuItem;
                return (
                  <DropdownMenu.Item key={name} asChild className={classes.dropdownMenuItem}>
                    <LinkComponent
                      text={name}
                      link={link}
                      // Close not working
                      onClick={handleClose}
                    />
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Group>
            {index !== menuGroups.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

import type { ReactElement } from 'react';
import { StudioLink } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import { DropdownMenu } from '@digdir/designsystemet-react';
import classes from './Items.module.css';

type ItemsProps = {
  items: StudioProfileMenuGroup[];
  onClose: () => void;
};

export const Items = ({ items, onClose }: ItemsProps): ReactElement => {
  return (
    <>
      {items.map((group, groupIndex) => (
        <DropdownMenu.Group
          key={groupIndex}
          heading={group.name}
          className={classes.dropDownMenuGroup}
        >
          {group.items.map((item) => {
            const itemKey = `${groupIndex}-${item.itemName}`;
            const { action } = item;

            if (action.type === 'link') {
              return (
                <DropdownMenu.Item key={itemKey} asChild>
                  <StudioLink
                    href={action.href}
                    target={action.openInNewTab ? '_blank' : undefined}
                    rel={action.openInNewTab ? 'noopener noreferrer' : undefined}
                    onClick={onClose}
                  >
                    {item.itemName}
                  </StudioLink>
                </DropdownMenu.Item>
              );
            }

            return (
              <DropdownMenu.Item
                key={itemKey}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={item.isActive ? classes.active : undefined}
              >
                {item.itemName}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Group>
      ))}
    </>
  );
};

import type { ReactElement } from 'react';
import { Fragment } from 'react';
import { StudioDropdown, StudioLink } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import classes from './Items.module.css';

type ItemsProps = {
  items: StudioProfileMenuGroup[];
};

export const Items = ({ items }: ItemsProps): ReactElement => {
  return (
    <>
      {items.map((group, groupIndex) => (
        <Fragment key={groupIndex}>
          <StudioDropdown.Heading>{group.name}</StudioDropdown.Heading>
          <StudioDropdown.List className={classes.dropDownMenuGroup}>
            {group.items.map((item) => {
              const itemKey = `${groupIndex}-${item.itemName}`;
              const { action } = item;

              if (action.type === 'link') {
                return (
                  <StudioDropdown.Item key={itemKey}>
                    <StudioDropdown.Button asChild>
                      <StudioLink
                        href={action.href}
                        role='menuitem'
                        target={action.openInNewTab ? '_blank' : undefined}
                        rel={action.openInNewTab ? 'noopener noreferrer' : undefined}
                      >
                        {item.itemName}
                      </StudioLink>
                    </StudioDropdown.Button>
                  </StudioDropdown.Item>
                );
              }

              return (
                <StudioDropdown.Item key={itemKey}>
                  <StudioDropdown.Button
                    role='menuitem'
                    onClick={action.onClick}
                    className={item.isActive ? classes.active : undefined}
                  >
                    {item.itemName}
                  </StudioDropdown.Button>
                </StudioDropdown.Item>
              );
            })}
          </StudioDropdown.List>
        </Fragment>
      ))}
    </>
  );
};

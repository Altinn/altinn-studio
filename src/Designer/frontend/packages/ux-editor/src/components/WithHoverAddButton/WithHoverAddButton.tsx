import React, { type ReactNode, useState } from 'react';
import { StudioCallToActionBar } from '@studio/components';
import type { IInternalLayout } from '../../types/global';
import classes from './WithHoverAddButton.module.css';
import { InlineItemAdder } from '../../containers/DesignView/AddItem/AddItem';
import { getItem } from '../../utils/formLayoutUtils';

export type WithHoverAddButtonProps = {
  children: ReactNode;
  title: string;
  containerId: string;
  saveAtIndexPosition: number;
  layout: IInternalLayout;
  isLastChild?: boolean;
};
export const WithHoverAddButton = ({
  children,
  title,
  containerId,
  layout,
  saveAtIndexPosition,
  isLastChild,
}: WithHoverAddButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const parentContainer = containerId ? getItem(layout, containerId) : null;
  const isLastChildInRepGroup = isLastChild && parentContainer?.type === 'RepeatingGroup';

  return (
    <>
      <StudioCallToActionBar
        onClick={() => setIsOpen((prev) => !prev)}
        title={title}
        isVisible={isOpen || hovered}
        actionBarClassName={classes.hoverCallToAction}
        className={isLastChildInRepGroup ? classes.lastChild : undefined}
        data-testid='with-hover-add-button-root'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </StudioCallToActionBar>
      {isOpen && (
        <div>
          <InlineItemAdder
            containerId={containerId}
            layout={layout}
            toggleIsOpen={() => setIsOpen(false)}
            saveAtIndexPosition={saveAtIndexPosition}
          />
        </div>
      )}
    </>
  );
};

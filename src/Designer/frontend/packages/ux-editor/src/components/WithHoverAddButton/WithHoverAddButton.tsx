import React, { type ReactNode, useState } from 'react';
import { StudioCallToActionBar } from 'libs/studio-components/src';
import type { IInternalLayout } from '../../types/global';
import classes from './WithHoverAddButton.module.css';
import { InlineItemAdder } from '../../containers/DesignView/AddItem/AddItem';

export type WithHoverAddButtonProps = {
  children: ReactNode;
  title: string;
  containerId: string;
  saveAtIndexPosition: number;
  layout: IInternalLayout;
};
export const WithHoverAddButton = ({
  children,
  title,
  containerId,
  layout,
  saveAtIndexPosition,
}: WithHoverAddButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <StudioCallToActionBar
        onClick={() => setIsOpen((prev) => !prev)}
        title={title}
        isVisible={isOpen || hovered}
        actionBarClassName={classes.hoverCallToAction}
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

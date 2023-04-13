import React from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import { DraggableToolbarItem } from '../../containers/DraggableToolbarItem';
import { ComponentType } from '../index';

interface IToolbarItemProps {
  text: string;
  onDropAction: (containerId: string, position: number) => void;
  notDraggable?: boolean;
  onClick: (...args: any) => void;
  componentType: ComponentType;
  icon: string;
}

export const ToolbarItem = ({
  notDraggable,
  onDropAction,
  componentType,
  onClick,
  text,
  icon,
}: IToolbarItemProps) => {
  return (
    <div>
      <DraggableToolbarItem
        id={null}
        index={null}
        containerId={null}
        notDraggable={notDraggable}
        onDrop={onDropAction}
      >
        <ToolbarItemComponent
          onClick={onClick}
          componentType={componentType}
          thirdPartyLabel={text}
          icon={icon}
        />
      </DraggableToolbarItem>
    </div>
  );
};

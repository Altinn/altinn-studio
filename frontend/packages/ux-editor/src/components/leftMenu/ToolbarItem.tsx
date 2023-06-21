import React, { MouseEvent } from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import { DraggableToolbarItem } from '../dragAndDrop/DraggableToolbarItem';
import { ComponentType } from 'app-shared/types/ComponentType';

interface IToolbarItemProps {
  text: string;
  notDraggable?: boolean;
  onClick: (type: ComponentType, event: MouseEvent) => void;
  componentType: ComponentType;
  icon: string;
}

export const ToolbarItem = ({
  notDraggable,
  componentType,
  onClick,
  text,
  icon,
}: IToolbarItemProps) => {
  return (
    <div>
      <DraggableToolbarItem
        notDraggable={notDraggable}
        item={{
          type: componentType,
          isNew: true,
        }}
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

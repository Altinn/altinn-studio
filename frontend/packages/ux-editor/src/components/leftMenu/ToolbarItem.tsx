import React, { MouseEvent } from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';

interface IToolbarItemProps {
  text: string;
  notDraggable?: boolean;
  onClick: (type: ComponentType, event: MouseEvent) => void;
  componentType: ComponentType;
  icon?: React.ComponentType;
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
      <DragAndDrop.NewItem<ComponentType> notDraggable={notDraggable} payload={componentType}>
        <ToolbarItemComponent
          onClick={onClick}
          componentType={componentType}
          thirdPartyLabel={text}
          icon={icon}
        />
      </DragAndDrop.NewItem>
    </div>
  );
};

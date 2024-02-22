import React, { type MouseEvent } from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

interface IToolbarItemProps {
  text: string;
  notDraggable?: boolean;
  onClick: (type: ComponentTypeV3, event: MouseEvent) => void;
  componentType: ComponentTypeV3;
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
      <DragAndDropTree.NewItem<ComponentTypeV3> notDraggable={notDraggable} payload={componentType}>
        <ToolbarItemComponent
          onClick={onClick}
          componentType={componentType}
          thirdPartyLabel={text}
          icon={icon}
        />
      </DragAndDropTree.NewItem>
    </div>
  );
};

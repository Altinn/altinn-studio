import type { MouseEvent } from 'react';
import React from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

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
      <DragAndDropTree.NewItem<ComponentType> notDraggable={notDraggable} payload={componentType}>
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

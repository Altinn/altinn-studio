import React from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import type { ComponentType, InternalComponentType } from 'app-shared/types/ComponentType';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

type ToolbarItemProps = {
  componentTitle: string;
  notDraggable?: boolean;
  componentType: ComponentType | InternalComponentType;
  icon?: React.ComponentType;
};

export const ToolbarItem = ({
  notDraggable,
  componentType,
  componentTitle,
  icon,
}: ToolbarItemProps) => {
  return (
    <div>
      <DragAndDropTree.NewItem<ComponentType | InternalComponentType>
        notDraggable={notDraggable}
        payload={componentType}
      >
        <ToolbarItemComponent
          componentType={componentType}
          componentTitle={componentTitle}
          icon={icon}
        />
      </DragAndDropTree.NewItem>
    </div>
  );
};

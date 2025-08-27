import React from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { StudioDragAndDropTree } from 'libs/studio-components-legacy/src';

type ToolbarItemProps = {
  componentTitle: string;
  notDraggable?: boolean;
  componentType: ComponentType | CustomComponentType;
  icon?: React.ComponentType;
};

export const ToolbarItem = ({
  notDraggable,
  componentType,
  componentTitle,
  icon,
}: ToolbarItemProps) => {
  return (
    <StudioDragAndDropTree.NewItem<ComponentType | CustomComponentType>
      notDraggable={notDraggable}
      payload={componentType}
    >
      <ToolbarItemComponent
        componentType={componentType}
        componentTitle={componentTitle}
        icon={icon}
      />
    </StudioDragAndDropTree.NewItem>
  );
};

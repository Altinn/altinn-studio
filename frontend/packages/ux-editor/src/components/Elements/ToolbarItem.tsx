import React from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

type ToolbarItemProps = {
  text: string;
  notDraggable?: boolean;
  componentType: ComponentType;
  icon?: React.ComponentType;
};

export const ToolbarItem = ({ notDraggable, componentType, text, icon }: ToolbarItemProps) => {
  return (
    <div>
      <DragAndDropTree.NewItem<ComponentType> notDraggable={notDraggable} payload={componentType}>
        <ToolbarItemComponent componentType={componentType} thirdPartyLabel={text} icon={icon} />
      </DragAndDropTree.NewItem>
    </div>
  );
};

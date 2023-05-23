import React, { MouseEvent } from 'react';
import { ToolbarItemComponent } from '../toolbar/ToolbarItemComponent';
import { DraggableToolbarItem } from '../dragAndDrop/DraggableToolbarItem';
import { FormItemType } from 'app-shared/types/FormItemType';

interface IToolbarItemProps {
  text: string;
  notDraggable?: boolean;
  onClick: (type: FormItemType, event: MouseEvent) => void;
  componentType: FormItemType;
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

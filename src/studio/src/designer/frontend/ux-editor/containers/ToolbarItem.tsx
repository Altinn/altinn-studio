import React from 'react';
import { ToolbarItemComponent } from '../components/toolbar/ToolbarItemComponent';
import { DraggableToolbarItem } from './DraggableToolbarItem';

interface IToolbarItemProps {
  text: string;
  onDropAction: (...args: any) => void;
  // eslint-disable-next-line react/require-default-props
  notDraggable?: boolean;
  onClick: (...args: any) => void;
  componentType: string;
  icon: string;
}

export const ToolbarItem = ({
  notDraggable,
  onDropAction,
  componentType,
  onClick,
  text,
  icon,
}: IToolbarItemProps): JSX.Element => {
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

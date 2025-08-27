import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model/index';
import { extractNameFromPointer } from '@altinn/schema-model/index';
import { CogIcon, FileJsonIcon } from 'libs/studio-icons/src';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import { typeItemId } from '@studio/testing/testids';
import { StudioDragAndDropTree } from '@studio/components-legacy';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  setSelectedTypePointer: (pointer: string) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, setSelectedTypePointer }: TypeItemProps) => {
  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.schemaPointer);
  };
  const name = extractNameFromPointer(uiSchemaNode.schemaPointer);

  return (
    <StudioDragAndDropTree.NewItem payload={name}>
      <div
        className={classNames(classes.item, {
          [classes.itemSelected]: selected,
        })}
        onClick={handleClick}
        data-testid={typeItemId(uiSchemaNode.schemaPointer)}
      >
        <div>
          <FileJsonIcon className={classes.typeIcon} />
        </div>
        <span className={classes.typeName}>{name}</span>
        <CogIcon />
      </div>
    </StudioDragAndDropTree.NewItem>
  );
};

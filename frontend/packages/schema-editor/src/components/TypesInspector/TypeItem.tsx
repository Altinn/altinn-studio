import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { extractNameFromPointer } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@navikt/aksel-icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import * as testids from '../../../../../testing/testids';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  setSelectedTypePointer: (pointer: string) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, setSelectedTypePointer }: TypeItemProps) => {
  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.pointer);
  };
  const name = extractNameFromPointer(uiSchemaNode.pointer);

  return (
    <DragAndDropTree.NewItem payload={name}>
      <div
        className={classNames(classes.item, {
          [classes.itemSelected]: selected,
        })}
        onClick={handleClick}
        data-testid={testids.typeItem(uiSchemaNode.pointer)}
      >
        <div>
          <FileJsonIcon className={classes.typeIcon} />
        </div>
        <span className={classes.typeName}>{name}</span>
        <CogIcon />
      </div>
    </DragAndDropTree.NewItem>
  );
};

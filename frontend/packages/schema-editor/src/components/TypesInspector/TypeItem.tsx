import React from 'react';
import { getNameFromPointer, UiSchemaNode } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@navikt/aksel-icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import * as testids from '../../../../../testing/testids';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  handleItemClick: (node: UiSchemaNode) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, handleItemClick }: TypeItemProps) => {
  const handleClick = () => {
    handleItemClick(uiSchemaNode);
  };
  return (
    <div
      className={classNames(classes.item, {
        [classes.itemSelected]: selected,
      })}
      onClick={handleClick}
      data-testid={testids.typeItem(uiSchemaNode.pointer)}
    >
      <div>
      <FileJsonIcon className={classes.typeIcon}/> 
      </div>
      <span className={classes.typeName}>
        {getNameFromPointer({ pointer: uiSchemaNode.pointer })}
      </span>
      <CogIcon />
    </div>
  );
};

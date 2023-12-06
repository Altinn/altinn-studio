import React from 'react';
import { extractNameFromPointer, UiSchemaNode } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@navikt/aksel-icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import * as testids from '../../../../../testing/testids';
import { useDispatch } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  setSelectedTypePointer: (pointer: string) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, setSelectedTypePointer }: TypeItemProps) => {
  const dispatch = useDispatch();

  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.pointer);
    dispatch(setSelectedId({ pointer: uiSchemaNode.pointer }));
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
        <FileJsonIcon className={classes.typeIcon} />
      </div>
      <span className={classes.typeName}>{extractNameFromPointer(uiSchemaNode.pointer)}</span>
      <CogIcon />
    </div>
  );
};

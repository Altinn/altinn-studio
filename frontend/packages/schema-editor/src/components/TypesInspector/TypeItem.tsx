import React from 'react';
import { getNameFromPointer, UiSchemaNode } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@navikt/aksel-icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import * as testids from '../../../../../testing/testids';
import { useDispatch } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
}

export const TypeItem = ({ uiSchemaNode }: TypeItemProps) => {
  const { selectedTypePointer, setSelectedTypePointer } = useSchemaEditorAppContext();
  const dispatch = useDispatch();

  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.pointer);
    dispatch(setSelectedId({ pointer: uiSchemaNode.pointer }));
  };
  return (
    <div
      className={classNames(classes.item, {
        [classes.itemSelected]: uiSchemaNode.pointer === selectedTypePointer,
      })}
      onClick={handleClick}
      data-testid={testids.typeItem(uiSchemaNode.pointer)}
    >
      <div>
        <FileJsonIcon className={classes.typeIcon} />
      </div>
      <span className={classes.typeName}>
        {getNameFromPointer({ pointer: uiSchemaNode.pointer })}
      </span>
      <CogIcon />
    </div>
  );
};

import React from 'react';
import { extractNameFromPointer, FieldType, setType, UiSchemaNode } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@navikt/aksel-icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import * as testids from '../../../../../testing/testids';
import { useDispatch } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  setSelectedTypePointer: (pointer: string) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, setSelectedTypePointer }: TypeItemProps) => {
  const dispatch = useDispatch();
  const { schemaModel, save } = useSchemaEditorAppContext();
  const pointer = uiSchemaNode.pointer;

  const onChangeFieldType = (type: FieldType) => {
    save(setType(schemaModel, { path: pointer, type }));
  };

  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.pointer);
    dispatch(setSelectedId({ pointer: uiSchemaNode.pointer }));
    onChangeFieldType(FieldType.Object);
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

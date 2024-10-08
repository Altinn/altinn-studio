import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { extractNameFromPointer } from '@altinn/schema-model';
import { CogIcon, FileJsonIcon } from '@studio/icons';
import classes from './TypeItem.module.css';
import classNames from 'classnames';
import { typeItemId } from '@studio/testing/testids';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { useTranslation } from 'react-i18next';

export interface TypeItemProps {
  uiSchemaNode: UiSchemaNode;
  selected?: boolean;
  setSelectedTypePointer: (pointer: string) => void;
}

export const TypeItem = ({ uiSchemaNode, selected, setSelectedTypePointer }: TypeItemProps) => {
  const handleClick = () => {
    setSelectedTypePointer(uiSchemaNode.schemaPointer);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (selected) {
      event.preventDefault();
      alert(t('schema_editor.reference_type_in_use_title'));
    }
  };

  const name = extractNameFromPointer(uiSchemaNode.schemaPointer);
  const { t } = useTranslation();

  return (
    <DragAndDropTree.NewItem payload={name}>
      <div
        className={classNames(classes.item, {
          [classes.itemSelected]: selected,
        })}
        onClick={handleClick}
        data-testid={typeItemId(uiSchemaNode.schemaPointer)}
        draggable={true}
        onDragStart={handleDragStart}
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

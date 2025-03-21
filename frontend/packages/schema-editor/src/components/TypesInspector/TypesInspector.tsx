import type { MouseEvent } from 'react';
import React from 'react';
import { StudioButton } from '@studio/components-legacy';
import { PlusIcon } from '@studio/icons';
import type { UiSchemaNode } from '@altinn/schema-model';
import { SchemaModel } from '@altinn/schema-model';
import classes from './TypesInspector.module.css';
import { useTranslation } from 'react-i18next';
import { TypeItem } from './TypeItem';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { NoItemSelectedMessage } from '../NoItemSelectedMessage';

export interface TypesInspectorProps {
  schemaItems: UiSchemaNode[];
}

export const TypesInspector = ({ schemaItems }: TypesInspectorProps) => {
  const { t } = useTranslation();
  const {
    schemaModel,
    save,
    selectedTypePointer,
    setSelectedTypePointer,
    setSelectedUniquePointer,
  } = useSchemaEditorAppContext();

  const setSelectedType = (schemaPointer: string) => {
    setSelectedTypePointer(schemaPointer);
    const uniquePointer = SchemaModel.getUniquePointer(schemaPointer);
    setSelectedUniquePointer(uniquePointer);
  };

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    const name = schemaModel.generateUniqueDefinitionName('name');
    const newNode = schemaModel.addFieldType(name);
    setSelectedType(newNode.schemaPointer);
    save(schemaModel);
  };

  if (!schemaItems) {
    return <NoItemSelectedMessage />;
  }

  return (
    <div className={classes.root}>
      <div className={classes.types}>
        <div className={classes.addRow}>
          <span className={classes.addRowText}>{t('schema_editor.types')}</span>
          <StudioButton
            className={classes.addRowButton}
            variant='tertiary'
            icon={<PlusIcon height={40} />}
            onClick={handleAddDefinition}
            title={t('schema_editor.add_type')}
          />
        </div>

        {schemaItems.map((item) => (
          <TypeItem
            uiSchemaNode={item}
            key={item.schemaPointer}
            selected={item.schemaPointer === selectedTypePointer}
            setSelectedTypePointer={setSelectedType}
          />
        ))}
      </div>
    </div>
  );
};

import type { MouseEvent } from 'react';
import React from 'react';
import { StudioButton, StudioHeading } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import type { UiSchemaNode } from '@altinn/schema-model';
import { SchemaModel } from '@altinn/schema-model';
import classes from './TypesInspector.module.css';
import { useTranslation } from 'react-i18next';
import { TypeItem } from './TypeItem';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

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

  return (
    <div className={classes.root}>
      <div className={classes.headingContainer}>
        <StudioHeading level={2} size='2xs'>
          {t('schema_editor.types')}
        </StudioHeading>
        <StudioButton
          className={classes.addTypeButton}
          variant='tertiary'
          icon={<PlusIcon height={40} />}
          onClick={handleAddDefinition}
          title={t('schema_editor.add_type')}
        />
      </div>
      <div className={classes.typesList}>
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

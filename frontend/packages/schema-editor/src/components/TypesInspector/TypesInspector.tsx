import type { MouseEvent } from 'react';
import React from 'react';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@navikt/aksel-icons';
import type { UiSchemaNode } from '@altinn/schema-model';
import classes from './TypesInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { TypeItem } from './TypeItem';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

export interface TypesInspectorProps {
  schemaItems: UiSchemaNode[];
}

export const TypesInspector = ({ schemaItems }: TypesInspectorProps) => {
  const { t } = useTranslation();
  const { schemaModel, save, selectedTypePointer, setSelectedTypePointer, setSelectedNodePointer } =
    useSchemaEditorAppContext();

  const setSelectedType = (pointer: string) => {
    setSelectedTypePointer(pointer);
    setSelectedNodePointer(pointer);
  };

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    const name = schemaModel.generateUniqueDefinitionName('name');
    const newNode = schemaModel.addFieldType(name);
    setSelectedType(newNode.pointer);
    save(schemaModel);
  };

  if (!schemaItems) {
    return (
      <div>
        <p className={classes.noItem} id='no-item-paragraph'>
          {t('schema_editor.no_item_selected')}
        </p>
        <Divider />
      </div>
    );
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
            size='small'
          />
        </div>

        {schemaItems.map((item) => (
          <TypeItem
            uiSchemaNode={item}
            key={item.pointer}
            selected={item.pointer === selectedTypePointer}
            setSelectedTypePointer={setSelectedType}
          />
        ))}
      </div>
    </div>
  );
};

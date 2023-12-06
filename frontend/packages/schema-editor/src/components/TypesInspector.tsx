import React, { MouseEvent } from 'react';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { UiSchemaNode } from '@altinn/schema-model';
import classes from './TypesInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { TypeItem } from './TypesInspector/TypeItem';
import { useDispatch } from 'react-redux';
import { setSelectedAndFocusedNode } from '../features/editor/schemaEditorSlice';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface TypesInspectorProps {
  schemaItems: UiSchemaNode[];
}

export const TypesInspector = ({ schemaItems }: TypesInspectorProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { schemaModel, save, selectedTypePointer, setSelectedTypePointer } =
    useSchemaEditorAppContext();

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    const name = schemaModel.generateUniqueDefinitionName('name');
    const newNode = schemaModel.addFieldType(name);
    dispatch(setSelectedAndFocusedNode(newNode.pointer));
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
          <Button
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
            setSelectedTypePointer={setSelectedTypePointer}
          />
        ))}
      </div>
    </div>
  );
};

import React, { MouseEvent } from 'react';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { FieldType, Keyword, makePointer, UiSchemaNode, addRootItem } from '@altinn/schema-model';
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
  const { data, save } = useSchemaEditorAppContext();

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    save(
      addRootItem(data, {
        name: 'name',
        location: makePointer(Keyword.Definitions),
        props: { fieldType: FieldType.Object },
        callback: (newPointer) => {
          dispatch(setSelectedAndFocusedNode(newPointer));
        },
      })
    );
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
            variant='quiet'
            icon={<PlusIcon height={40} />}
            onClick={handleAddDefinition}
            size='small'
          />
        </div>

        {schemaItems.map((item) => (
          <TypeItem uiSchemaNode={item} key={item.pointer} />
        ))}
      </div>
    </div>
  );
};

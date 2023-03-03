import React, { MouseEvent } from 'react';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Add } from '@navikt/ds-icons';
import { FieldType, Keywords, makePointer, UiSchemaNode } from '@altinn/schema-model';
import classes from './TypesInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { TypeItem } from './TypesInspector/TypeItem';
import { useDispatch } from 'react-redux';
import { addRootItem } from '../features/editor/schemaEditorSlice';

export interface TypesInspectorProps {
  schemaItems: UiSchemaNode[];
  handleSelectType: (node: UiSchemaNode) => void;
  selectedNodePointer?: string;
}

export const TypesInspector = ({
  schemaItems,
  handleSelectType,
  selectedNodePointer,
}: TypesInspectorProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(
      addRootItem({
        name: 'name',
        location: makePointer(Keywords.Definitions),
        props: { fieldType: FieldType.Object },
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
    <div className={classes.root} data-testid='schema-inspector'>
      <div className={classes.types}>
        <div className={classes.addRow}>
          <span className={classes.addRowText}>Typer</span>
          <Button
            className={classes.addRowButton}
            variant={ButtonVariant.Quiet}
            icon={<Add height={40} />}
            onClick={handleAddDefinition}
          ></Button>
        </div>

        {schemaItems.map((item) => (
          <TypeItem
            uiSchemaNode={item}
            key={item.pointer}
            handleItemClick={handleSelectType}
            selected={item.pointer === selectedNodePointer}
          />
        ))}
      </div>
    </div>
  );
};

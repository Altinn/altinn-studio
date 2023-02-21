import type { BaseSyntheticEvent } from 'react';
import React, { useEffect } from 'react';
import type { ISchemaState } from '../../types';
import { PropertyItem } from './PropertyItem';
import {
  addProperty,
  deleteProperty,
  setPropertyName,
  setType,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { UiSchemaNode, FieldType } from '@altinn/schema-model';
import { getChildNodesByPointer, getNameFromPointer } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from '../../hooks/usePrevious';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { Add } from '@navikt/ds-icons';
import { useTranslation } from 'react-i18next';

export interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
}

export const ItemFieldsTab = ({ selectedItem }: ItemFieldsTabProps) => {
  const readonly = selectedItem.reference !== undefined;
  const dispatch = useDispatch();

  const fieldNodes = useSelector((state: ISchemaState) =>
    getChildNodesByPointer(state.uiSchema, selectedItem.pointer).map((node) => ({
      ...node,
      domId: getDomFriendlyID(node.pointer),
    }))
  );

  const numberOfChildNodes = fieldNodes.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;

  useEffect(() => {
    // If the number of fields has increased, a new field has been added and should get focus
    if (numberOfChildNodes > prevNumberOfChildNodes) {
      const newNodeId = fieldNodes[fieldNodes.length - 1].domId;
      const newNodeInput = document.getElementById(newNodeId) as HTMLInputElement;
      newNodeInput?.focus();
      newNodeInput?.select();
    }
  }, [numberOfChildNodes, prevNumberOfChildNodes, fieldNodes]);

  const onChangePropertyName = (path: string, value: string) =>
    dispatch(
      setPropertyName({
        path,
        name: value,
      })
    );

  const onChangeType = (path: string, type: FieldType) => dispatch(setType({ path, type }));

  const onDeleteObjectClick = (path: string) => dispatch(deleteProperty({ path }));

  const dispatchAddProperty = () =>
    dispatch(
      addProperty({
        pointer: selectedItem.pointer,
        keepSelection: true,
        props: {},
      })
    );

  const onAddPropertyClicked = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    dispatchAddProperty();
  };

  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      {fieldNodes.length > 0 && (
        <>
          <div>{t('schema_editor.field_name')}</div>
          <div>{t('schema_editor.type')}</div>
          <div>{t('schema_editor.required')}</div>
          <div>{t('schema_editor.delete')}</div>
        </>
      )}
      {fieldNodes.map((fieldNode) => (
        <PropertyItem
          fullPath={fieldNode.pointer}
          inputId={fieldNode.domId}
          key={fieldNode.pointer}
          onChangeType={onChangeType}
          onChangeValue={onChangePropertyName}
          onDeleteField={onDeleteObjectClick}
          onEnterKeyPress={dispatchAddProperty}
          readOnly={readonly}
          required={fieldNode.isRequired}
          type={fieldNode.fieldType as FieldType}
          value={getNameFromPointer(fieldNode)}
        />
      ))}
      {!readonly && (
        <div className={classes.addButtonCell}>
          <Button
            color={ButtonColor.Secondary}
            icon={<Add />}
            onClick={onAddPropertyClicked}
            variant={ButtonVariant.Outline}
          >
            {t('schema_editor.add_property')}
          </Button>
        </div>
      )}
    </div>
  );
};

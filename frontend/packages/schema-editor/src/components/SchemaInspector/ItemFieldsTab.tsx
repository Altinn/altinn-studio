import type { BaseSyntheticEvent } from 'react';
import React, { useEffect } from 'react';
import { PropertyItem } from './PropertyItem';
import { removeSelection } from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import type { UiSchemaNode, FieldType } from '@altinn/schema-model';
import {
  addProperty,
  deleteNode,
  getNameFromPointer,
  setType,
} from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { getFieldNodesSelector } from '@altinn/schema-editor/selectors/schemaStateSelectors';

export interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
}

export const ItemFieldsTab = ({ selectedItem }: ItemFieldsTabProps) => {
  const readonly = selectedItem.reference !== undefined;
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  const fieldNodes = getFieldNodesSelector(selectedItem)(data);

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

  const onChangeType = (path: string, type: FieldType) => mutate(setType(data, { path, type }));

  const onDeleteObjectClick = (path: string) => {
    mutate(deleteNode(data, path));
    dispatch(removeSelection(path));
  };

  const dispatchAddProperty = () =>
    mutate(addProperty(data, { pointer: selectedItem.pointer, props: {} }));

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
            icon={<PlusIcon />}
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

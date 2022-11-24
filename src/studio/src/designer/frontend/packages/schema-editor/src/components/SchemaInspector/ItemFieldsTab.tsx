import type { BaseSyntheticEvent } from 'react';
import React, { useEffect } from 'react';
import type { ILanguage, ISchemaState } from '../../types';
import { PropertyItem } from './PropertyItem';
import {
  addProperty,
  deleteProperty,
  setPropertyName,
  setType,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode, FieldType } from '@altinn/schema-model';
import { getChildNodesByPointer, getNodeDisplayName } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from '../../hooks/usePrevious';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';

export interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
}

export const ItemFieldsTab = ({ selectedItem, language }: ItemFieldsTabProps) => {
  const readonly = selectedItem.ref !== undefined;
  const dispatch = useDispatch();

  const childNodes = useSelector((state: ISchemaState) =>
    getChildNodesByPointer(state.uiSchema, selectedItem.pointer).map((node) => ({
      ...node,
      domId: getDomFriendlyID(node.pointer),
    }))
  );

  const numberOfChildNodes = childNodes.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;

  useEffect(() => {
    // If the number of fields has increased, a new field has been added and should get focus
    if (numberOfChildNodes > prevNumberOfChildNodes) {
      const newNodeId = childNodes[childNodes.length - 1].domId;
      const newNodeInput = document.getElementById(newNodeId) as HTMLInputElement;
      newNodeInput?.focus();
      newNodeInput?.select();
    }
  }, [numberOfChildNodes, prevNumberOfChildNodes, childNodes]);

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

  const t = (key: string) => getTranslation(key, language);

  return (
    <div className={classes.root}>
      {childNodes.length && (
        <>
          <div>{t('field_name')}</div>
          <div>{t('type')}</div>
          <div>{t('required')}</div>
          <div>{t('delete')}</div>
        </>
      )}
      {childNodes.map((childNode) => (
        <PropertyItem
          fullPath={childNode.pointer}
          inputId={childNode.domId}
          key={childNode.pointer}
          language={language}
          onChangeType={onChangeType}
          onChangeValue={onChangePropertyName}
          onDeleteField={onDeleteObjectClick}
          onEnterKeyPress={dispatchAddProperty}
          readOnly={readonly}
          required={childNode.isRequired}
          type={childNode.fieldType as FieldType}
          value={getNodeDisplayName(childNode)}
        />
      ))}
      {!readonly && (
        <div className={classes.addButtonCell}>
          <Button
            color={ButtonColor.Secondary}
            iconName={'Add'}
            onClick={onAddPropertyClicked}
            variant={ButtonVariant.Outline}
          >
            {t('add_property')}
          </Button>
        </div>
      )}
    </div>
  );
};

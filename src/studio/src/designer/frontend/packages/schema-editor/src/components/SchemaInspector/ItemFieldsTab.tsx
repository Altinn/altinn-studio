import React, { BaseSyntheticEvent, useEffect } from 'react';
import { AddPropertyButton } from './AddPropertyButton';
import type { ILanguage, ISchemaState } from '../../types';
import { PropertyItem } from './PropertyItem';
import { addProperty, deleteProperty, setPropertyName } from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getChildNodesByPointer, getNodeDisplayName } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { usePrevious } from '../../hooks/usePrevious';

export interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
}
export const ItemFieldsTab = ({ selectedItem, language }: ItemFieldsTabProps) => {
  const readonly = selectedItem.ref !== undefined;
  const dispatch = useDispatch();

  const childNodes = useSelector((state: ISchemaState) => getChildNodesByPointer(state.uiSchema, selectedItem.pointer));

  const numberOfChildNodes = childNodes.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;

  useEffect(() => {
    // If the number of fields has increased, a new field has been added and should get focus
    if (numberOfChildNodes > prevNumberOfChildNodes) {
      const newNodeId = propertyInputIdFromNode(childNodes[childNodes.length - 1]);
      const newNodeInput = document.getElementById(newNodeId) as HTMLInputElement;
      newNodeInput?.focus();
      newNodeInput?.select();
    }
  }, [numberOfChildNodes, prevNumberOfChildNodes, childNodes])

  const onChangePropertyName = (path: string, value: string) =>
    dispatch(
      setPropertyName({
        path,
        name: value,
      }),
    );

  const onDeleteObjectClick = (path: string) => dispatch(deleteProperty({ path }));

  const dispatchAddProperty = () =>
    dispatch(
      addProperty({
        pointer: selectedItem.pointer,
        keepSelection: true,
        props: {},
      }),
    );

  const onAddPropertyClicked = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    dispatchAddProperty();
  };

  return (
    <div className={classes.root}>
      {childNodes.map((childNode) => (
        <PropertyItem
          fullPath={childNode.pointer}
          inputId={propertyInputIdFromNode(childNode)}
          key={childNode.pointer}
          language={language}
          onChangeValue={onChangePropertyName}
          onDeleteField={onDeleteObjectClick}
          onEnterKeyPress={dispatchAddProperty}
          readOnly={readonly}
          required={childNode.isRequired}
          value={getNodeDisplayName(childNode)}
        />
      ))}
      {!readonly && (
        <div>
          <AddPropertyButton
            label={getTranslation('add_property', language)}
            onAddPropertyClick={onAddPropertyClicked}
          />
        </div>
      )}
    </div>
  );
};

const propertyInputIdFromNode = (node: UiSchemaNode) => getDomFriendlyID(node.pointer, 'input');

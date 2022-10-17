import React, { BaseSyntheticEvent } from 'react';
import { AddPropertyButton } from './AddPropertyButton';
import type { ILanguage, ISchemaState } from '../../types';
import { PropertyItem } from './PropertyItem';
import { addProperty, deleteProperty, setPropertyName } from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getChildNodesByNode, getNodeDisplayName } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';

interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
}
export const ItemFieldsTab = ({ selectedItem, language }: ItemFieldsTabProps) => {
  const readonly = selectedItem.ref !== undefined;
  const dispatch = useDispatch();
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
  const childNodes = useSelector((state: ISchemaState) => getChildNodesByNode(state.uiSchema, selectedItem));
  return (
    <div className={classes.root}>
      {childNodes.map((childNode) => (
        <PropertyItem
          language={language}
          key={childNode.pointer}
          required={childNode.isRequired}
          readOnly={readonly}
          value={getNodeDisplayName(childNode)}
          fullPath={childNode.pointer}
          onChangeValue={onChangePropertyName}
          onDeleteField={onDeleteObjectClick}
          onEnterKeyPress={dispatchAddProperty}
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

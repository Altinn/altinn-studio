import React, { BaseSyntheticEvent } from 'react';
import { Grid } from '@material-ui/core';
import { AddPropertyButton } from './AddPropertyButton';
import type { ILanguage, ISchemaState } from '../../types';
import { PropertyItem } from './PropertyItem';
import { addProperty, deleteProperty, setPropertyName } from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getChildNodesByNode, getNodeDisplayName } from '@altinn/schema-model';

interface ItemFieldsTabProps {
  classes: any;
  selectedItem: UiSchemaNode;
  language: ILanguage;
}
export const ItemFieldsTab = ({ classes, selectedItem, language }: ItemFieldsTabProps) => {
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

  const dispatchAddProperty = () => {
    const path = selectedItem.pointer;
    if (path) {
      dispatch(
        addProperty({
          path,
          keepSelection: true,
        }),
      );
    }
  };
  const onAddPropertyClicked = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    dispatchAddProperty();
  };
  const childNodes = useSelector((state: ISchemaState) => getChildNodesByNode(state.uiSchema, selectedItem));
  return (
    <>
      <div style={{ height: 32 }}></div>
      <Grid container spacing={3} className={classes.gridContainer}>
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
      </Grid>
      {!readonly && (
        <AddPropertyButton onAddPropertyClick={onAddPropertyClicked} label={getTranslation('add_property', language)} />
      )}
    </>
  );
};

import React, { BaseSyntheticEvent } from 'react';
import { Grid } from '@material-ui/core';
import { AddPropertyButton } from './AddPropertyButton';
import { ILanguage, UiSchemaItem } from '../../types';
import { PropertyItem } from './PropertyItem';
import { addProperty, deleteProperty, setPropertyName } from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { getTranslation } from '../../utils/language';

interface ItemFieldsTabProps {
  classes: any;
  selectedItem: UiSchemaItem;
  language: ILanguage;
}
export const ItemFieldsTab = ({ classes, selectedItem, language }: ItemFieldsTabProps) => {
  const readonly = selectedItem.$ref !== undefined;
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
    const path = selectedItem.path;
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
  return (
    <>
      <Grid container spacing={3} className={classes.gridContainer}>
        {selectedItem?.properties?.map((prop) => (
          <PropertyItem
            language={language}
            key={prop.path}
            required={selectedItem?.required?.includes(prop.displayName)}
            readOnly={readonly}
            value={prop.displayName}
            fullPath={prop.path}
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

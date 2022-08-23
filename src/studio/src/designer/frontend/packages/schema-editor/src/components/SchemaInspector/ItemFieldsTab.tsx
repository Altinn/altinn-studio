import React from 'react';
import { Grid } from '@material-ui/core';
import { AddPropertyButton } from '../AddPropertyButton';
import { ILanguage, UiSchemaItem } from '../../types';
import { PropertyItem } from '../PropertyItem';
import {
  addProperty,
  deleteProperty,
  setPropertyName,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';

interface ItemFieldsTabProps {
  classes: any;
  selectedItem?: UiSchemaItem;
  language: ILanguage;
}
export const ItemFieldsTab = ({
  classes,
  selectedItem,
  language,
}: ItemFieldsTabProps) => {
  const readonly = selectedItem?.$ref !== undefined;
  const dispatch = useDispatch();
  const onChangePropertyName = (path: string, value: string) =>
    dispatch(
      setPropertyName({
        path,
        name: value,
      }),
    );

  const onDeleteObjectClick = (path: string) =>
    dispatch(deleteProperty({ path }));

  const renderItemProperties = (item: UiSchemaItem) => {
    return item.properties?.map((p: UiSchemaItem) => (
      <PropertyItem
        language={language}
        key={p.path}
        required={item.required?.includes(p.displayName)}
        readOnly={readonly}
        value={p.displayName}
        fullPath={p.path}
        onChangeValue={onChangePropertyName}
        onDeleteField={onDeleteObjectClick}
      />
    ));
  };
  const onAddPropertyClicked = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    const path = selectedItem?.path;
    if (path) {
      dispatch(
        addProperty({
          path,
          keepSelection: true,
        }),
      );
    }
  };
  return (
    <>
      <Grid container spacing={3} className={classes.gridContainer}>
        {selectedItem && renderItemProperties(selectedItem)}
      </Grid>
      {!readonly && (
        <AddPropertyButton
          onAddPropertyClick={onAddPropertyClicked}
          language={language}
        />
      )}
    </>
  );
};

import React, { BaseSyntheticEvent, MouseEvent } from 'react';
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
} from '@material-ui/core';
import { getTranslation } from '../../utils/language';
import { ILanguage, Restriction, UiSchemaItem } from '../../types';
import { RestrictionField } from './RestrictionField';
import { EnumField } from './EnumField';
import {
  addEnum,
  addRestriction,
  deleteEnum,
  deleteField,
  setRequired,
  setRestriction,
  setRestrictionKey,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { Label } from './Label';

interface Props {
  classes: any;
  selectedItem: UiSchemaItem;
  language: ILanguage;
}
export const ItemRestrictionsTab = ({
  classes,
  selectedItem,
  language,
}: Props) => {
  const dispatch = useDispatch();
  const readonly = selectedItem.$ref !== undefined;
  const handleRequiredChanged = (e: any, checked: boolean) => {
    if (checked !== selectedItem.isRequired) {
      dispatch(
        setRequired({
          path: selectedItem.path,
          key: selectedItem.displayName,
          required: checked,
        }),
      );
    }
  };

  const onChangeRestrictionValue = (path: string, value: any, key: string) =>
    dispatch(
      setRestriction({
        path,
        value: isNaN(value) ? value : +value,
        key,
      }),
    );

  const onChangeRestrictionKey = (
    path: string,
    oldKey: string,
    newKey: string,
  ) => {
    if (oldKey !== newKey) {
      dispatch(
        setRestrictionKey({
          path,
          oldKey,
          newKey,
        }),
      );
    }
  };

  const onDeleteFieldClick = (path: string, key: string) =>
    dispatch(deleteField({ path, key }));

  const onAddRestrictionClick = (event?: BaseSyntheticEvent) => {
    event?.preventDefault();
    dispatch(
      addRestriction({
        path: selectedItem.path,
        key: '',
        value: '',
      }),
    );
  };

  const renderItemRestrictions = (item: UiSchemaItem) =>
    item.restrictions?.map((field: Restriction) =>
      !field.key.startsWith('@') ? (
        <RestrictionField
          key={field.key}
          language={language}
          type={selectedItem.type}
          value={field.value}
          keyName={field.key}
          readOnly={readonly}
          path={item.path}
          onChangeValue={onChangeRestrictionValue}
          onChangeKey={onChangeRestrictionKey}
          onDeleteField={onDeleteFieldClick}
          onReturn={onAddRestrictionClick}
        />
      ) : null,
    );

  const onChangeEnumValue = (value: string, oldValue?: string) =>
    dispatch(
      addEnum({
        path: selectedItem.path,
        value,
        oldValue,
      }),
    );

  const onDeleteEnumClick = (path: string, value: string) =>
    dispatch(deleteEnum({ path, value }));

  const dispatchAddEnum = () => {
    if (selectedItem) {
      dispatch(
        addEnum({
          path: selectedItem.path,
          value: 'value',
        }),
      );
    }
  };
  const onAddEnumButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchAddEnum();
  };
  return (
    <Grid container spacing={1} className={classes.gridContainer}>
      <Grid item xs={12}>
        <FormControlLabel
          className={classes.header}
          control={
            <Checkbox
              checked={selectedItem.isRequired}
              onChange={handleRequiredChanged}
              name='checkedRequired'
            />
          }
          label={getTranslation('required', language)}
        />
      </Grid>
      {selectedItem.$ref === undefined && (
        <>
          <Grid item xs={12}>
            <Divider />
          </Grid>
          <Grid item xs={4}>
            <p>{getTranslation('keyword', language)}</p>
          </Grid>
          <Grid item xs={1} />
          <Grid item xs={7}>
            <p>{getTranslation('value', language)}</p>
          </Grid>
          {renderItemRestrictions(selectedItem)}
          <IconButton
            id='add-restriction-button'
            aria-label={getTranslation('add_restriction', language)}
            onClick={onAddRestrictionClick}
          >
            <i className='fa fa-plus' />
            {getTranslation('add_restriction', language)}
          </IconButton>
        </>
      )}

      {selectedItem.type !== 'object' && (
        <>
          <Grid item xs={12}>
            <Divider />
            <Label>{getTranslation('enum', language)}</Label>
          </Grid>
          {selectedItem.enum?.map((value: string, index) => (
            <EnumField
              key={'add-enum-field-' + index}
              language={language}
              path={selectedItem.path}
              fullWidth={true}
              value={value}
              onChange={onChangeEnumValue}
              onDelete={onDeleteEnumClick}
              onEnterKeyPress={dispatchAddEnum}
            />
          ))}
          <IconButton
            id='add-enum-button'
            aria-label={getTranslation('add_enum', language)}
            onClick={onAddEnumButtonClick}
          >
            <i className='fa fa-plus' />
            {getTranslation('add_enum', language)}
          </IconButton>
        </>
      )}
    </Grid>
  );
};

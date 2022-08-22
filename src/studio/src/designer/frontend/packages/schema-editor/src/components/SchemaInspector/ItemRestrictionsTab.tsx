import React from 'react';
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
} from '@material-ui/core';
import { getTranslation } from '../../utils/language';
import { ILanguage, Restriction, UiSchemaItem } from '../../types';
import { RestrictionField } from '../RestrictionField';
import { EnumField } from '../EnumField';
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

interface ItemRestrictionsProps {
  classes: any;
  isRequired: boolean;
  itemToDisplay?: UiSchemaItem;
  language: ILanguage;
  readonly: boolean;
}
export const ItemRestrictionsTab = ({
  classes,
  isRequired,
  itemToDisplay,
  language,
  readonly,
}: ItemRestrictionsProps) => {
  const dispatch = useDispatch();

  const handleRequiredChanged = (e: any, checked: boolean) => {
    if (itemToDisplay && checked !== isRequired) {
      dispatch(
        setRequired({
          path: itemToDisplay?.path,
          key: itemToDisplay?.displayName,
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

  const onAddRestrictionClick = (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    if (itemToDisplay) {
      dispatch(
        addRestriction({
          path: itemToDisplay.path,
          key: '',
          value: '',
        }),
      );
    }
  };

  const renderItemRestrictions = (item: UiSchemaItem) =>
    item.restrictions?.map((field: Restriction) =>
      !field.key.startsWith('@') ? (
        <RestrictionField
          key={field.key}
          language={language}
          type={itemToDisplay?.type}
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

  const onChangeEnumValue = (value: string, oldValue?: string) => {
    if (itemToDisplay) {
      dispatch(
        addEnum({
          path: itemToDisplay.path,
          value,
          oldValue,
        }),
      );
    }
  };
  const onDeleteEnumClick = (path: string, value: string) =>
    dispatch(deleteEnum({ path, value }));

  const renderEnums = (item: UiSchemaItem) =>
    item.enum?.map((value: string) => (
      <EnumField
        key={value}
        language={language}
        path={item.path}
        fullWidth={true}
        value={value}
        onChange={onChangeEnumValue}
        onDelete={onDeleteEnumClick}
      />
    ));

  const onAddEnumButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (itemToDisplay) {
      dispatch(
        addEnum({
          path: itemToDisplay.path,
          value: 'value',
        }),
      );
    }
  };
  return (
    <Grid container spacing={1} className={classes.gridContainer}>
      <Grid item xs={12}>
        <FormControlLabel
          className={classes.header}
          control={
            <Checkbox
              checked={isRequired}
              onChange={handleRequiredChanged}
              name='checkedRequired'
            />
          }
          label={getTranslation('required', language)}
        />
      </Grid>
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
      {itemToDisplay && renderItemRestrictions(itemToDisplay)}
      <IconButton
        id='add-restriction-button'
        aria-label={getTranslation('add_restriction', language)}
        onClick={onAddRestrictionClick}
      >
        <i className='fa fa-plus' />
        {getTranslation('add_restriction', language)}
      </IconButton>
      {itemToDisplay && itemToDisplay?.type !== 'object' && (
        <>
          <Grid item xs={12}>
            <Divider />
            <p className={classes.header}>{getTranslation('enum', language)}</p>
          </Grid>
          {itemToDisplay && renderEnums(itemToDisplay)}
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

import React, { MouseEvent } from 'react';
import { Checkbox, Divider, FormControlLabel, Grid, IconButton } from '@material-ui/core';
import { getTranslation } from '../../utils/language';
import { FieldType, ILanguage, Restriction, UiSchemaItem } from '../../types';
import { EnumField } from './EnumField';
import { addEnum, deleteEnum, setRequired, setRestriction } from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { Label } from './Label';
import { ArrayRestrictions } from './restrictions/ArrayRestrictions';
import { BooleanRestrictions } from './restrictions/BooleanRestrictions';
import { NumberRestrictions } from './restrictions/NumberRestrictions';
import { ObjectRestrictions } from './restrictions/ObjectRestrictions';
import { StringRestrictions } from './restrictions/StringRestrictions';

export interface RestrictionItemProps {
  restrictions: Restriction[];
  readonly: boolean;
  path: string;
  language: ILanguage;
  onChangeRestrictionValue: (id: string, key: string, value: string) => void;
}
interface Props {
  classes: any;
  item: UiSchemaItem;
  language: ILanguage;
}
export const ItemRestrictionsTab = ({ classes, item, language }: Props) => {
  const dispatch = useDispatch();
  const handleRequiredChanged = (e: any, checked: boolean) => {
    if (checked !== item.isRequired) {
      dispatch(
        setRequired({
          path: item.path,
          key: item.displayName,
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

  const onChangeEnumValue = (value: string, oldValue?: string) =>
    dispatch(
      addEnum({
        path: item.path,
        value,
        oldValue,
      }),
    );

  const onDeleteEnumClick = (path: string, value: string) => dispatch(deleteEnum({ path, value }));

  const dispatchAddEnum = () => {
    if (item) {
      dispatch(
        addEnum({
          path: item.path,
          value: 'value',
        }),
      );
    }
  };
  const onAddEnumButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchAddEnum();
  };

  const t = (key: string) => getTranslation(key, language);
  const restrictionProps: RestrictionItemProps = {
    restrictions: item.restrictions ?? [],
    readonly: item.$ref !== undefined,
    path: item.path,
    onChangeRestrictionValue,
    language,
  };
  return (
    <Grid container spacing={1} className={classes.gridContainer}>
      <Grid item xs={12}>
        <FormControlLabel
          className={classes.header}
          control={<Checkbox checked={item.isRequired} onChange={handleRequiredChanged} name='checkedRequired' />}
          label={t('required')}
        />
      </Grid>
      {item.$ref === undefined && (
        <Grid item xs={12}>
          {
            {
              [FieldType.Array]: <ArrayRestrictions {...restrictionProps} />,
              [FieldType.Boolean]: <BooleanRestrictions {...restrictionProps} />,
              [FieldType.Integer]: <NumberRestrictions {...restrictionProps} />,
              [FieldType.Number]: <NumberRestrictions {...restrictionProps} />,
              [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
              [FieldType.String]: <StringRestrictions {...restrictionProps} />,
              [FieldType.Null]: undefined,
              default: undefined,
            }[item.type ?? 'default']
          }
        </Grid>
      )}
      {item.type !== FieldType.Object && (
        <>
          <Grid item xs={12}>
            <Divider />
            <Label>{t('enum')}</Label>
          </Grid>
          {item.enum?.map((value: string, index) => (
            <EnumField
              key={'add-enum-field-' + index}
              language={language}
              path={item.path}
              fullWidth={true}
              value={value}
              onChange={onChangeEnumValue}
              onDelete={onDeleteEnumClick}
              onEnterKeyPress={dispatchAddEnum}
            />
          ))}
          <IconButton id='add-enum-button' aria-label={t('add_enum')} onClick={onAddEnumButtonClick}>
            <i className='fa fa-plus' />
            {t('add_enum')}
          </IconButton>
        </>
      )}
    </Grid>
  );
};

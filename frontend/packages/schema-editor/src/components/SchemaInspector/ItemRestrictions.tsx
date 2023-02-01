import type { MouseEvent } from 'react';
import React from 'react';
import { getTranslation } from '../../utils/language';
import type { ILanguage } from '../../types';
import type { Dict, UiSchemaNode } from '@altinn/schema-model';
import { FieldType } from '@altinn/schema-model';
import { EnumField } from './EnumField';
import {
  addEnum,
  deleteEnum,
  setRequired,
  setRestriction,
  setRestrictions,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { ArrayRestrictions } from './restrictions/ArrayRestrictions';
import { NumberRestrictions } from './restrictions/NumberRestrictions';
import { ObjectRestrictions } from './restrictions/ObjectRestrictions';
import { StringRestrictions } from './restrictions/StringRestrictions';
import classes from './ItemRestrictions.module.css';
import {
  Button,
  ButtonColor,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  FieldSet,
} from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { Add } from '@navikt/ds-icons';

export interface RestrictionItemProps {
  restrictions: any;
  readonly: boolean;
  path: string;
  language: ILanguage;
  onChangeRestrictionValue: (id: string, key: string, value?: string) => void;
  onChangeRestrictions: (id: string, restrictions: Dict) => void;
}
export interface ItemRestrictionsProps extends Omit<UiSchemaNode, 'children'> {
  language: ILanguage;
}
export const ItemRestrictions = ({
  pointer,
  isRequired,
  reference,
  isArray,
  ['enum']: enums,
  restrictions,
  fieldType,
  language,
}: ItemRestrictionsProps) => {
  const dispatch = useDispatch();
  const handleRequiredChanged = (e: any) => {
    const { checked } = e.target;
    if (checked !== isRequired) {
      dispatch(
        setRequired({
          path: pointer,
          required: checked,
        })
      );
    }
  };

  const onChangeRestrictionValue = (path: string, key: string, value?: string) =>
    dispatch(
      setRestriction({
        path,
        key,
        value,
      })
    );

  const onChangeRestrictions = (path: string, restrictions: Dict) =>
    dispatch(setRestrictions({ path, restrictions }));

  const onChangeEnumValue = (value: string, oldValue?: string) =>
    dispatch(
      addEnum({
        path: pointer,
        value,
        oldValue,
      })
    );

  const onDeleteEnumClick = (path: string, value: string) => dispatch(deleteEnum({ path, value }));

  const dispatchAddEnum = () =>
    dispatch(
      addEnum({
        path: pointer,
        value: 'value',
      })
    );

  const onAddEnumButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchAddEnum();
  };

  const t = (key: string) => getTranslation(key, language);
  const restrictionProps: RestrictionItemProps = {
    restrictions: restrictions ?? {},
    readonly: reference !== undefined,
    path: pointer ?? '',
    onChangeRestrictionValue,
    onChangeRestrictions,
    language,
  };
  return (
    <>
      <Checkbox
        checked={isRequired}
        label={t('required')}
        name='checkedRequired'
        onChange={handleRequiredChanged}
      />
      {reference === undefined &&
        {
          [FieldType.Integer]: <NumberRestrictions {...restrictionProps} />,
          [FieldType.Number]: <NumberRestrictions {...restrictionProps} />,
          [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
          [FieldType.String]: <StringRestrictions {...restrictionProps} />,
        }[fieldType as string]}
      {isArray && <ArrayRestrictions {...restrictionProps} />}
      {[FieldType.String, FieldType.Integer, FieldType.Number].includes(fieldType as FieldType) && (
        <>
          <Divider inMenu />
          <FieldSet legend={t('enum_legend')}>
            {!enums?.length && <p className={classes.emptyEnumMessage}>{t('enum_empty')}</p>}
            {enums?.map((value: string, index) => (
              <EnumField
                fullWidth={true}
                key={`add-enum-field-${index}`}
                language={language}
                onChange={onChangeEnumValue}
                onDelete={onDeleteEnumClick}
                onEnterKeyPress={dispatchAddEnum}
                path={pointer}
                value={value}
              />
            ))}
            <div className={classes.addEnumButton}>
              <Button
                aria-label={t('add_enum')}
                color={ButtonColor.Secondary}
                fullWidth
                icon={<Add />}
                id='add-enum-button'
                onClick={onAddEnumButtonClick}
                size={ButtonSize.Small}
                variant={ButtonVariant.Outline}
              >
                {t('add_enum')}
              </Button>
            </div>
          </FieldSet>
        </>
      )}
    </>
  );
};

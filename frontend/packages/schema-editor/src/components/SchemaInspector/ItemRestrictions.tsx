import { MouseEvent, useState } from 'react';
import React from 'react';
import { Dict, pointerIsDefinition, UiSchemaNode } from '@altinn/schema-model';
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
  ErrorMessage,
} from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';

export interface RestrictionItemProps {
  restrictions: any;
  readonly: boolean;
  path: string;
  onChangeRestrictionValue: (id: string, key: string, value?: string | boolean) => void;
  onChangeRestrictions: (id: string, restrictions: Dict) => void;
}

export type ItemRestrictionsProps = Omit<UiSchemaNode, 'children'>;

export const ItemRestrictions = ({
  pointer,
  isRequired,
  reference,
  isArray,
  ['enum']: enums,
  restrictions,
  fieldType,
}: ItemRestrictionsProps) => {
  const dispatch = useDispatch();

  const [enumError, setEnumError] = useState<string>(null);

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

  const onChangeRestrictionValue = (path: string, key: string, value?: string | boolean) =>
    dispatch(
      setRestriction({
        path,
        key,
        value,
      })
    );

  const onChangeRestrictions = (path: string, changedRestrictions: Dict) =>
    dispatch(setRestrictions({ path, restrictions: changedRestrictions }));

  const onChangeEnumValue = (value: string, oldValue?: string) => {
    if (value === oldValue) return;

    if (enums.includes(value)) {
      setEnumError(value);
    } else {
      setEnumError(null);
      dispatch(
        addEnum({
          path: pointer,
          value,
          oldValue,
        })
      );
    }
  };

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

  const { t } = useTranslation();
  const restrictionProps: RestrictionItemProps = {
    restrictions: restrictions ?? {},
    readonly: reference !== undefined,
    path: pointer ?? '',
    onChangeRestrictionValue,
    onChangeRestrictions,
  };
  return (
    <>
      {!pointerIsDefinition(pointer) && (
        <Checkbox
          checked={isRequired}
          label={t('schema_editor.required')}
          name='checkedRequired'
          onChange={handleRequiredChanged}
        />
      )}
      {reference === undefined &&
        {
          [FieldType.Integer]: <NumberRestrictions {...restrictionProps} isInteger />,
          [FieldType.Number]: <NumberRestrictions {...restrictionProps} isInteger={false} />,
          [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
          [FieldType.String]: <StringRestrictions {...restrictionProps} />,
        }[fieldType as string]}
      {isArray && <ArrayRestrictions {...restrictionProps} />}
      {[FieldType.String, FieldType.Integer, FieldType.Number].includes(fieldType as FieldType) && (
        <>
          <Divider marginless/>
          <FieldSet legend={t('schema_editor.enum_legend')}>
            {!enums?.length && (
              <p className={classes.emptyEnumMessage}>{t('schema_editor.enum_empty')}</p>
            )}
            {enumError !== null && (
              <ErrorMessage>
                <p>{t('schema_editor.enum_error_duplicate')}</p>
              </ErrorMessage>
            )}
            {enums?.map((value: string, index) => (
              <EnumField
                fullWidth={true}
                key={`add-enum-field-${index}`}
                onChange={onChangeEnumValue}
                onDelete={onDeleteEnumClick}
                onEnterKeyPress={dispatchAddEnum}
                path={pointer}
                value={value}
                isValid={enumError !== value}
              />
            ))}
            <div className={classes.addEnumButton}>
              <Button
                aria-label={t('schema_editor.add_enum')}
                color={ButtonColor.Secondary}
                fullWidth
                icon={<PlusIcon />}
                id='add-enum-button'
                onClick={onAddEnumButtonClick}
                size={ButtonSize.Small}
                variant={ButtonVariant.Outline}
              >
                {t('schema_editor.add_enum')}
              </Button>
            </div>
          </FieldSet>
        </>
      )}
    </>
  );
};

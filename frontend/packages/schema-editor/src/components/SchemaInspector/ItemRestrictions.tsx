import { MouseEvent, useState } from 'react';
import React from 'react';
import { pointerIsDefinition, UiSchemaNode } from '@altinn/schema-model';
import { FieldType } from '@altinn/schema-model';
import { EnumField } from './EnumField';
import {
  addEnumValue,
  deleteEnumValue,
  setRequired,
  setRestriction,
  setRestrictions,
} from '@altinn/schema-model';
import { ArrayRestrictions } from './restrictions/ArrayRestrictions';
import { NumberRestrictions } from './restrictions/NumberRestrictions';
import { ObjectRestrictions } from './restrictions/ObjectRestrictions';
import { StringRestrictions } from './restrictions/StringRestrictions';
import classes from './ItemRestrictions.module.css';
import { Button, Checkbox, Fieldset, ErrorMessage } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';

export interface RestrictionItemProps {
  restrictions: any;
  readonly: boolean;
  path: string;
  onChangeRestrictionValue: (id: string, key: string, value?: string | boolean) => void;
  onChangeRestrictions: (id: string, restrictions: KeyValuePairs) => void;
}

export type ItemRestrictionsProps = {
  schemaNode: UiSchemaNode;
};

export const ItemRestrictions = ({ schemaNode }: ItemRestrictionsProps) => {
  const {
    pointer,
    isRequired,
    reference,
    isArray,
    enum: enums,
    restrictions,
    fieldType,
  } = schemaNode;
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  const [enumError, setEnumError] = useState<string>(null);

  const handleRequiredChanged = (e: any) => {
    const { checked } = e.target;
    if (checked !== isRequired) {
      mutate(setRequired(data, { path: pointer, required: checked }));
    }
  };

  const onChangeRestrictionValue = (path: string, key: string, value?: string | boolean) =>
    mutate(setRestriction(data, { path, key, value }));

  const onChangeRestrictions = (path: string, changedRestrictions: KeyValuePairs) =>
    mutate(setRestrictions(data, { path, restrictions: changedRestrictions }));

  const onChangeEnumValue = (value: string, oldValue?: string) => {
    if (value === oldValue) return;

    if (enums.includes(value)) {
      setEnumError(value);
    } else {
      setEnumError(null);
      mutate(addEnumValue(data, { path: pointer, value, oldValue }));
    }
  };

  const onDeleteEnumClick = (path: string, value: string) =>
    mutate(deleteEnumValue(data, { path, value }));

  const dispatchAddEnum = () => mutate(addEnumValue(data, { path: pointer, value: 'value' }));

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
          aria-label={t('schema_editor.required')}
          value='checkedRequired'
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
          <Divider marginless />
          <Fieldset legend={t('schema_editor.enum_legend')}>
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
                color='secondary'
                fullWidth
                icon={<PlusIcon />}
                id='add-enum-button'
                onClick={onAddEnumButtonClick}
                size='small'
                variant='outline'
              >
                {t('schema_editor.add_enum')}
              </Button>
            </div>
          </Fieldset>
        </>
      )}
    </>
  );
};

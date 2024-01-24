import type { ChangeEvent } from 'react';
import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { isField, isReference, pointerIsDefinition } from '@altinn/schema-model';
import { FieldType } from '@altinn/schema-model';
import { setRequired, setRestriction, setRestrictions } from '@altinn/schema-model';
import { ArrayRestrictions } from './ArrayRestrictions';
import { NumberRestrictions } from './NumberRestrictions';
import { ObjectRestrictions } from './ObjectRestrictions';
import { StringRestrictions } from './StringRestrictions';
import classes from './ItemRestrictions.module.css';
import { Switch } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { EnumList } from './EnumList';

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
  const { t } = useTranslation();
  const { pointer, isRequired, isArray, restrictions } = schemaNode;
  const { schemaModel, save } = useSchemaEditorAppContext();

  const handleRequiredChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    if (checked !== isRequired) {
      save(setRequired(schemaModel, { path: pointer, required: checked }));
    }
  };

  const onChangeRestrictionValue = (path: string, key: string, value?: string | boolean) =>
    save(setRestriction(schemaModel, { path, key, value }));

  const onChangeRestrictions = (path: string, changedRestrictions: KeyValuePairs) =>
    save(setRestrictions(schemaModel, { path, restrictions: changedRestrictions }));

  const restrictionProps: RestrictionItemProps = {
    restrictions: restrictions ?? {},
    readonly: isReference(schemaNode),
    path: pointer ?? '',
    onChangeRestrictionValue,
    onChangeRestrictions,
  };
  return (
    <>
      {!pointerIsDefinition(pointer) && (
        <Switch
          className={classes.switch}
          size='small'
          checked={isRequired}
          onChange={handleRequiredChanged}
        >
          {t('schema_editor.required')}
        </Switch>
      )}
      {isField(schemaNode) &&
        {
          [FieldType.Integer]: <NumberRestrictions {...restrictionProps} isInteger />,
          [FieldType.Number]: <NumberRestrictions {...restrictionProps} isInteger={false} />,
          [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
          [FieldType.String]: <StringRestrictions {...restrictionProps} />,
        }[schemaNode.fieldType]}
      {isArray && <ArrayRestrictions {...restrictionProps} />}
      {isField(schemaNode) &&
        [FieldType.String, FieldType.Integer, FieldType.Number].includes(schemaNode.fieldType) && (
          <>
            <Divider marginless />
            <EnumList schemaNode={schemaNode} />
          </>
        )}
    </>
  );
};

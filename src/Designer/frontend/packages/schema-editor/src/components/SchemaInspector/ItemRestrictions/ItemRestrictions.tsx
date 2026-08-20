import { useCallback } from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  isField,
  isReference,
  FieldType,
  setRestriction,
  setRestrictions,
} from '@altinn/schema-model';

import { ArrayRestrictions } from './ArrayRestrictions';
import { NumberRestrictions } from './NumberRestrictions';
import { ObjectRestrictions } from './ObjectRestrictions';
import { StringRestrictions } from './StringRestrictions';
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
  const { schemaPointer, isArray, restrictions } = schemaNode;
  const { schemaModel, save } = useSchemaEditorAppContext();

  const onChangeRestrictionValue = (path: string, key: string, value?: string | boolean) =>
    save(setRestriction(schemaModel, { path, key, value }));

  const onChangeRestrictions = (path: string, changedRestrictions: KeyValuePairs) =>
    save(setRestrictions(schemaModel, { path, restrictions: changedRestrictions }));

  const handleChangeStringRestrictions = useCallback(
    (path: string, newRestrictions: KeyValuePairs): void => {
      save(schemaModel.setRestrictions(path, newRestrictions));
    },
    [schemaModel, save],
  );

  const restrictionProps: RestrictionItemProps = {
    restrictions: restrictions ?? {},
    readonly: isReference(schemaNode),
    path: schemaPointer ?? '',
    onChangeRestrictionValue,
    onChangeRestrictions,
  };
  return (
    <>
      {isField(schemaNode) &&
        {
          [FieldType.Integer]: <NumberRestrictions {...restrictionProps} isInteger />,
          [FieldType.Number]: <NumberRestrictions {...restrictionProps} isInteger={false} />,
          [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
          [FieldType.String]: (
            <StringRestrictions
              {...restrictionProps}
              onChangeRestrictions={handleChangeStringRestrictions}
            />
          ),
        }[schemaNode.fieldType]}
      {isArray && <ArrayRestrictions {...restrictionProps} />}
      {isField(schemaNode) &&
        [FieldType.String, FieldType.Integer, FieldType.Number].includes(schemaNode.fieldType) && (
          <EnumList schemaNode={schemaNode} />
        )}
    </>
  );
};

import React, { ReactElement } from 'react';
import { FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import {
  BooleanIcon,
  CombinationIcon,
  LinkIcon,
  NumberIcon,
  QuestionmarkIcon,
  StringIcon,
} from '@studio/icons';

export const renderIcon = (schemaModel: SchemaModel, pointer: string): ReactElement => {
  const node = schemaModel.getNode(pointer);
  switch (node.objectKind) {
    case ObjectKind.Combination:
      return <CombinationIcon />;
    case ObjectKind.Reference:
      return <LinkIcon />;
    case ObjectKind.Field:
      return renderFieldIcon(node.fieldType);
  }
};

const renderFieldIcon = (fieldType: FieldType): ReactElement => {
  switch (fieldType) {
    case FieldType.Boolean:
      return <BooleanIcon />;
    case FieldType.Integer:
    case FieldType.Number:
      return <NumberIcon />;
    case FieldType.Object:
      return null;
    case FieldType.String:
      return <StringIcon />;
    default:
      return <QuestionmarkIcon />;
  }
};

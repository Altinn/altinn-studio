import React, { ReactElement } from 'react';
import { FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import {
  Boolean,
  Combination,
  LinkIcon,
  Number,
  QuestionmarkIcon,
  String,
} from '@studio/icons';

export const renderIcon = (schemaModel: SchemaModel, pointer: string): ReactElement => {
  const node = schemaModel.getNode(pointer);
  const children = schemaModel.getChildNodes(pointer);
  if (children.length) return null;
  switch (node.objectKind) {
    case ObjectKind.Combination:
      return <Combination />;
    case ObjectKind.Reference:
      return <LinkIcon />;
    case ObjectKind.Field:
      return renderFieldIcon(node.fieldType);
  }
};

const renderFieldIcon = (fieldType: FieldType): ReactElement => {
  switch (fieldType) {
    case FieldType.Boolean:
      return <Boolean />;
    case FieldType.Integer:
    case FieldType.Number:
      return <Number />;
    case FieldType.Object:
      return null;
    case FieldType.String:
      return <String />;
    default:
      return <QuestionmarkIcon />;
  }
};

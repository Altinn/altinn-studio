import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import {
  BooleanIcon,
  CombinationIcon,
  NumberIcon,
  ObjectIcon,
  QuestionmarkIcon,
  ReferenceIcon,
  StringIcon,
} from '@studio/icons';
import type { IconProps } from '@studio/icons';
import classes from './NodeIcon.module.css';
import cn from 'classnames';

export interface NodeIconProps extends IconProps {
  node: UiSchemaNode;
}

export const NodeIcon = ({ node, className, ...rest }: NodeIconProps) => (
  <InternalIcon
    node={node}
    className={cn(classes.icon, node.isArray && classes.isArray, className)}
    {...rest}
  />
);

type InternalIconProps = IconProps & NodeIconProps;

const InternalIcon = ({ node, ...iconProps }: InternalIconProps) => {
  switch (node.objectKind) {
    case ObjectKind.Combination:
      return <CombinationIcon {...iconProps} />;
    case ObjectKind.Reference:
      return <ReferenceIcon {...iconProps} />;
    case ObjectKind.Field:
      switch (node.fieldType) {
        case FieldType.Object:
          return <ObjectIcon {...iconProps} />;
        case FieldType.Boolean:
          return <BooleanIcon {...iconProps} />;
        case FieldType.Integer:
        case FieldType.Number:
          return <NumberIcon {...iconProps} />;
        case FieldType.String:
          return <StringIcon {...iconProps} />;
        default:
          return <QuestionmarkIcon />;
      }
  }
};

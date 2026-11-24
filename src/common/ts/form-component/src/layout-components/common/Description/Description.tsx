import React from 'react';
import type { HTMLAttributes } from 'react';

import cn from 'classnames';

import { getDescriptionId } from '../../utils/labelIds';
import classes from './Description.module.css';

export type DescriptionProps = {
  description: React.ReactNode;
  componentId?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function Description({ description, className, componentId, ...rest }: DescriptionProps) {
  if (!description) {
    return null;
  }

  return (
    <span
      {...rest}
      className={cn(classes.description, className)}
      id={getDescriptionId(componentId)}
      data-testid={getDescriptionId(componentId)}
    >
      {description}
    </span>
  );
}
